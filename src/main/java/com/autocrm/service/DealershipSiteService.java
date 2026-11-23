package com.autocrm.service;

import java.util.List;
import java.net.URI;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import com.autocrm.model.Customer;
import com.autocrm.model.DealershipSite;
import com.autocrm.model.Lead;
import com.autocrm.model.Tenant;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.DealershipSiteRepository;
import com.autocrm.repository.DealershipSiteImageRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.TenantContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DealershipSiteService {
    private static final Pattern SITE_IMAGE_PATH = Pattern.compile(
            "/public/site-images/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    private static final Set<String> IMAGE_CONFIG_KEYS = Set.of("logoUrl", "heroImage", "aboutImage");
    public record SiteResponse(String slug, String templateId, JsonNode config, boolean published) {}
    public record SiteUpdate(String slug, String templateId, JsonNode config) {}
    public record PublicSiteResponse(String showroomName, String templateId, JsonNode config) {}
    public record PublicCar(Long id, String make, String model, String variant, String description, Integer year,
            Integer kmDriven, String fuel, String transmission, String bodyType, String ownerType,
            String color, java.math.BigDecimal price, String status, String registrationNo,
            String registrationAt, String registrationType, String insuranceType, String sellerNote,
            String createdAt, List<String> photos) {}
    public record EnquiryRequest(@NotBlank @Size(max=120) String name,
            @NotBlank @Size(max=30) String phone, @Email @NotBlank String email,
            @Size(max=1000) String message, String kind) {}

    private final DealershipSiteRepository sites;
    private final DealershipSiteImageRepository siteImages;
    private final TenantRepository tenants;
    private final VehicleRepository vehicles;
    private final VehicleImageService images;
    private final CustomerRepository customers;
    private final LeadRepository leads;
    private final AuditLogService audit;
    private final ObjectMapper mapper;
    private CrmNotificationService notifications;

    public DealershipSiteService(DealershipSiteRepository sites, DealershipSiteImageRepository siteImages,
            TenantRepository tenants,
            VehicleRepository vehicles, VehicleImageService images,
            CustomerRepository customers, LeadRepository leads, AuditLogService audit, ObjectMapper mapper) {
        this.sites = sites; this.siteImages = siteImages; this.tenants = tenants; this.vehicles = vehicles;
        this.images = images; this.customers = customers;
        this.leads = leads; this.audit = audit; this.mapper = mapper;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setNotifications(CrmNotificationService notifications) { this.notifications = notifications; }

    @Transactional
    public SiteResponse ownerSite() {
        Long tenantId = TenantContext.requireTenantId();
        return response(sites.findById(tenantId).orElseGet(() -> {
            DealershipSite site = new DealershipSite();
            site.setTenantId(tenantId);
            site.setSlug("dealer-" + tenantId);
            return sites.save(site);
        }));
    }

    @Transactional
    public SiteResponse update(SiteUpdate input) {
        if (input == null || input.slug() == null || !input.slug().matches("[a-z0-9-]{3,40}")
                || input.templateId() == null || !List.of("classic", "modern", "bold").contains(input.templateId())
                || input.config() == null || !input.config().isObject()
                || input.config().toString().length() > 16000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid website settings");
        }
        Long tenantId = TenantContext.requireTenantId();
        validateConfig(input.config(), tenantId);
        ownerSite();
        DealershipSite site = sites.findById(tenantId).orElseThrow();
        if (!site.getSlug().equals(input.slug()) && sites.existsBySlug(input.slug())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Website address already in use");
        }
        boolean changed = !site.getSlug().equals(input.slug())
                || !site.getTemplateId().equals(input.templateId())
                || !site.getConfig().equals(input.config().toString());
        site.setSlug(input.slug());
        site.setTemplateId(input.templateId());
        site.setConfig(input.config().toString());
        DealershipSite saved = sites.save(site);
        if (changed) {
            audit.record("DEALERSHIP_SITE_UPDATED", "TENANT", tenantId,
                    "Dealership website settings updated.");
        }
        return response(saved);
    }

    @Transactional
    public SiteResponse publish(boolean published) {
        ownerSite();
        Long tenantId = TenantContext.requireTenantId();
        DealershipSite site = sites.findById(tenantId).orElseThrow();
        boolean previous = site.isPublished();
        site.setPublished(published);
        DealershipSite saved = sites.save(site);
        if (previous != published) {
            audit.record("DEALERSHIP_SITE_PUBLICATION_CHANGED", "TENANT", tenantId,
                    "Website published: " + previous + " -> " + published);
        }
        return response(saved);
    }

    @Transactional(readOnly=true)
    public PublicSiteResponse publicSite(String slug) {
        DealershipSite site = findPublished(slug);
        Tenant tenant = tenants.findById(site.getTenantId()).orElseThrow();
        return new PublicSiteResponse(tenant.getName(), site.getTemplateId(), config(site));
    }

    @Transactional(readOnly=true)
    public List<PublicCar> publicCars(String slug) {
        Long tenantId = findPublished(slug).getTenantId();
        return carsForTenant(tenantId);
    }

    @Transactional(readOnly=true)
    public List<PublicCar> previewCars() {
        return carsForTenant(TenantContext.requireTenantId());
    }

    private List<PublicCar> carsForTenant(Long tenantId) {
        return vehicles.findByTenantId(tenantId).stream()
                .filter(v -> tenantId.equals(v.getTenantId()) && v.isPubliclyVisible()
                        && !"SOLD".equalsIgnoreCase(v.getStatus()))
                .map(this::car).toList();
    }

    @Transactional(readOnly=true)
    public PublicCar publicCar(String slug, Long id) {
        Long tenantId = findPublished(slug).getTenantId();
        Vehicle vehicle = vehicles.findByVehicleIdAndTenantId(id, tenantId)
                .filter(v -> tenantId.equals(v.getTenantId()) && v.isPubliclyVisible()
                        && !"SOLD".equalsIgnoreCase(v.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));
        return car(vehicle);
    }

    @Transactional
    public void enquiry(String slug, EnquiryRequest request) {
        Long tenantId = findPublished(slug).getTenantId();
        Customer c = new Customer();
        c.setTenantId(tenantId);
        c.setName(request.name().trim());
        c.setPhone(request.phone().trim());
        c.setEmail(request.email().trim());
        c = customers.save(c);
        audit.recordPublicEnquiry(tenantId, "CUSTOMER_CREATED", "CUSTOMER", c.getCustomerId());
        Lead lead = new Lead();
        lead.setTenantId(tenantId);
        lead.setCustomerId(c.getCustomerId());
        lead.setSource("PUBLIC_SHOWROOM");
        lead.setStatus("NEW");
        lead.setInterestedVehicle("General website enquiry");
        lead.setNotes(request.message());
        lead.setAssignedUserId(null);
        lead = leads.save(lead);
        audit.recordPublicEnquiry(tenantId, "LEAD_CREATED", "LEAD", lead.getLeadId());
        if (notifications != null) {
            notifications.create(tenantId, "enquiry", "New website enquiry", "A website visitor sent an enquiry.",
                    "LEAD", lead.getLeadId());
        }
    }

    private DealershipSite findPublished(String slug) {
        return sites.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Website not found"));
    }

    private void validateConfig(JsonNode config, Long tenantId) {
        for (Map.Entry<String, JsonNode> field : config.properties()) {
            if (!field.getValue().isTextual()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Website settings must contain text values");
            }
            String value = field.getValue().asText().trim();
            if (IMAGE_CONFIG_KEYS.contains(field.getKey()) && !value.isEmpty()
                    && !SITE_IMAGE_PATH.matcher(value).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Website images must use an uploaded dealership image");
            }
            if (IMAGE_CONFIG_KEYS.contains(field.getKey()) && !value.isEmpty()) {
                String imageId = value.substring("/public/site-images/".length());
                if (!siteImages.existsByIdAndTenantId(java.util.UUID.fromString(imageId), tenantId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Website images must belong to this dealership");
                }
            }
            if ("primaryColor".equals(field.getKey()) && !value.isEmpty()
                    && !value.matches("#[0-9a-fA-F]{6}")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid website colour");
            }
            if (("facebook".equals(field.getKey()) || "instagram".equals(field.getKey()))
                    && !value.isEmpty() && !isApprovedSocialUrl(field.getKey(), value)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Social links must use a secure link to the matching social network");
            }
        }
    }

    private boolean isApprovedSocialUrl(String key, String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || uri.getUserInfo() != null) {
                return false;
            }
            String normalizedHost = host.toLowerCase(Locale.ROOT);
            String allowedHost = "facebook".equals(key) ? "facebook.com" : "instagram.com";
            return normalizedHost.equals(allowedHost) || normalizedHost.endsWith("." + allowedHost);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private PublicCar car(Vehicle v) {
        List<String> photoUrls = images.getPublicImages(v.getVehicleId()).stream()
                .map(p -> "/api/public/vehicles/" + v.getVehicleId() + "/images/" + p.vehicleImageId()).toList();
        return new PublicCar(v.getVehicleId(), v.getMake(), v.getModel(), v.getVariant(), v.getDescription(), v.getYear(),
                v.getKilometers(), v.getFuelType(), v.getTransmission(), v.getBodyType(), v.getOwnerType(),
                v.getColor(), v.getPrice(), v.getStatus(), v.getRegistrationNumber(), v.getRegistrationAt(),
                v.getRegistrationType(), v.getInsuranceType(), v.getSellerNote(), null, photoUrls);
    }

    private SiteResponse response(DealershipSite site) {
        return new SiteResponse(site.getSlug(), site.getTemplateId(), config(site), site.isPublished());
    }

    private JsonNode config(DealershipSite site) {
        try { return mapper.readTree(site.getConfig()); }
        catch (Exception e) { throw new IllegalStateException("Invalid saved website settings", e); }
    }
}
