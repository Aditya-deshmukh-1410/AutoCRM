package com.autocrm.service;

import com.autocrm.dto.PublicSellCarRequest;
import com.autocrm.model.Customer;
import com.autocrm.model.DealershipSite;
import com.autocrm.model.Lead;
import com.autocrm.model.WebsiteSellPhoto;
import com.autocrm.model.WebsiteSellRequest;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.DealershipSiteRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.WebsiteSellPhotoRepository;
import com.autocrm.repository.WebsiteSellRequestRepository;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PublicWebsiteSellService {
    private static final int MAX_PHOTOS = 6;
    private static final long MAX_PHOTO_BYTES = 2L * 1024 * 1024;
    private static final List<String> IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    public record PhotoInfo(UUID id, String contentType) {}
    public record PhotoContent(String contentType, byte[] data) {}
    public record SellRequestItem(String id, String leadName, String phone, String email,
            String carMake, String carModel, String carVariant, int carYear, Integer regMonth,
            String ownerType, String color, String city, String registrationNo, String registrationAt,
            Integer kmDriven, String insuranceType, String lifetimeTax, java.time.LocalDate insuranceValidTill,
            Boolean accidental, Boolean floodAffected, java.math.BigDecimal expectedPrice, String warranties,
            String modifications, String sellerNote, String features, String carCondition, String status,
            java.time.Instant createdAt) {}
    private static final Set<String> SELL_STATUSES = Set.of("NEW", "CONTACTED", "OFFER_MADE", "PURCHASED", "REJECTED");

    private final DealershipSiteRepository sites;
    private final CustomerRepository customers;
    private final LeadRepository leads;
    private final WebsiteSellPhotoRepository photos;
    private final WebsiteSellRequestRepository requests;
    private final AuditLogService audit;
    private final CrmNotificationService notifications;
    private final ObjectMapper mapper;

    public PublicWebsiteSellService(DealershipSiteRepository sites, CustomerRepository customers,
            LeadRepository leads, WebsiteSellPhotoRepository photos, WebsiteSellRequestRepository requests,
            AuditLogService audit, CrmNotificationService notifications, ObjectMapper mapper) {
        this.sites = sites;
        this.customers = customers;
        this.leads = leads;
        this.photos = photos;
        this.requests = requests;
        this.audit = audit;
        this.notifications = notifications;
        this.mapper = mapper;
    }

    @Transactional
    public Long submit(String slug, PublicSellCarRequest request, List<MultipartFile> uploads) {
        DealershipSite site = sites.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Website not found"));
        Long tenantId = site.getTenantId();
        List<MultipartFile> files = uploads == null ? List.of() : uploads.stream().filter(f -> !f.isEmpty()).toList();
        if (files.size() > MAX_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload up to 6 car photos");
        }
        for (MultipartFile file : files) {
            String type = file.getContentType();
            if (file.getSize() > MAX_PHOTO_BYTES || type == null
                    || !IMAGE_TYPES.contains(type.toLowerCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Each photo must be a JPEG, PNG, or WebP image under 2 MB");
            }
        }

        Customer customer = new Customer();
        customer.setTenantId(tenantId);
        customer.setName(request.name().trim());
        customer.setPhone(request.phone().trim());
        customer.setEmail(StringUtils.hasText(request.email()) ? request.email().trim() : null);
        Customer savedCustomer = customers.save(customer);

        Lead lead = new Lead();
        lead.setTenantId(tenantId);
        lead.setCustomerId(savedCustomer.getCustomerId());
        lead.setAssignedUserId(null);
        lead.setSource("PUBLIC_SELL_REQUEST");
        lead.setStatus("NEW");
        lead.setInterestedVehicle("Seller offer: " + request.carYear() + " " + request.carMake().trim()
                + " " + request.carModel().trim());
        lead.setNotes("Website sell-car submission. Full vehicle details and photos are in Sell Requests.");
        Lead savedLead = leads.save(lead);

        WebsiteSellRequest sellRequest = new WebsiteSellRequest();
        sellRequest.setLeadId(savedLead.getLeadId());
        sellRequest.setTenantId(tenantId);
        try {
            sellRequest.setDetails(mapper.writeValueAsString(request));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not store seller details", exception);
        }
        sellRequest.setStatus("NEW");
        sellRequest.setCreatedAt(java.time.Instant.now());
        requests.save(sellRequest);

        for (MultipartFile file : files) {
            try {
                WebsiteSellPhoto photo = new WebsiteSellPhoto();
                photo.setId(UUID.randomUUID());
                photo.setTenantId(tenantId);
                photo.setLeadId(savedLead.getLeadId());
                byte[] data = file.getBytes();
                try {
                    photo.setContentType(UploadedImageValidator.validate(data, file.getContentType(), 4000,
                            16_000_000L));
                } catch (IllegalArgumentException invalidImage) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalidImage.getMessage());
                }
                photo.setData(data);
                photos.save(photo);
            } catch (IOException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read an uploaded photo");
            }
        }
        audit.recordPublicEnquiry(tenantId, "CUSTOMER_CREATED", "CUSTOMER", savedCustomer.getCustomerId());
        audit.recordPublicEnquiry(tenantId, "LEAD_CREATED", "LEAD", savedLead.getLeadId());
        notifications.create(tenantId, "sell_request", "New car sell request",
                "Website visitor wants to sell " + request.carYear() + " " + request.carMake() + " "
                        + request.carModel() + " (" + files.size() + " photos)",
                "SELL_REQUEST", savedLead.getLeadId());
        return savedLead.getLeadId();
    }

    @Transactional(readOnly = true)
    public List<SellRequestItem> list() {
        Long tenantId = com.autocrm.security.TenantContext.requireTenantId();
        return requests.findTop100ByTenantIdOrderByCreatedAtDesc(tenantId).stream().map(request -> {
            Lead lead = leads.findByLeadIdAndTenantId(request.getLeadId(), tenantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
            Customer customer = customers.findByCustomerIdAndTenantId(lead.getCustomerId(), tenantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
            try {
                PublicSellCarRequest details = mapper.readValue(request.getDetails(), PublicSellCarRequest.class);
                return new SellRequestItem(String.valueOf(lead.getLeadId()), customer.getName(), customer.getPhone(),
                        customer.getEmail(), details.carMake(), details.carModel(), details.carVariant(),
                        details.carYear(), details.regMonth(), details.ownerType(), details.color(), details.city(),
                        details.registrationNo(), details.registrationAt(), details.kmDriven(), details.insuranceType(),
                        details.lifetimeTax(), details.insuranceValidTill(), details.accidental(),
                        details.floodAffected(), details.expectedPrice(), details.warranties(), details.modifications(),
                        details.sellerNote(), json(details.features()), json(details.condition()),
                        request.getStatus().toLowerCase(Locale.ROOT), request.getCreatedAt());
            } catch (Exception exception) {
                throw new IllegalStateException("Could not read seller request details", exception);
            }
        }).toList();
    }

    @Transactional
    public void updateStatus(Long leadId, String status) {
        if (status == null || !SELL_STATUSES.contains(status.trim().toUpperCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sell request status");
        }
        Long tenantId = com.autocrm.security.TenantContext.requireTenantId();
        WebsiteSellRequest request = requests.findByLeadIdAndTenantId(leadId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sell request not found"));
        request.setStatus(status.trim().toUpperCase(Locale.ROOT));
    }

    @Transactional(readOnly = true)
    public List<PhotoInfo> photosForLead(Long leadId) {
        Long tenantId = com.autocrm.security.TenantContext.requireTenantId();
        requireLead(leadId, tenantId);
        return photos.findByLeadIdAndTenantId(leadId, tenantId).stream()
                .map(photo -> new PhotoInfo(photo.getId(), photo.getContentType())).toList();
    }

    @Transactional(readOnly = true)
    public PhotoContent photo(Long leadId, UUID photoId) {
        Long tenantId = com.autocrm.security.TenantContext.requireTenantId();
        requireLead(leadId, tenantId);
        WebsiteSellPhoto photo = photos.findByIdAndLeadIdAndTenantId(photoId, leadId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));
        return new PhotoContent(photo.getContentType(), photo.getData());
    }

    private void requireLead(Long leadId, Long tenantId) {
        if (tenantId == null || requests.findByLeadIdAndTenantId(leadId, tenantId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found");
        }
    }

    private String json(Object value) {
        if (value == null) return null;
        try { return mapper.writeValueAsString(value); }
        catch (Exception exception) { return null; }
    }

}
