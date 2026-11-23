package com.autocrm.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import com.autocrm.model.DealershipSite;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.*;
import com.autocrm.security.TenantContext;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class DealershipSiteServiceTest {
    @Mock DealershipSiteRepository sites;
    @Mock DealershipSiteImageRepository siteImages;
    @Mock TenantRepository tenants;
    @Mock VehicleRepository vehicles;
    @Mock VehicleImageService images;
    @Mock CustomerRepository customers;
    @Mock LeadRepository leads;
    @Mock AuditLogService audit;

    private DealershipSiteService service() {
        return new DealershipSiteService(sites, siteImages, tenants, vehicles, images, customers, leads, audit,
                new ObjectMapper());
    }

    @AfterEach
    void clearTenantContext() { TenantContext.clear(); }

    @Test
    void publishedSlugReturnsOnlyPublishedCarsBelongingToItsTenant() {
        DealershipSite site = new DealershipSite();
        site.setTenantId(9L);
        site.setSlug("dealer-nine");
        site.setPublished(true);
        when(sites.findBySlugAndPublishedTrue("dealer-nine")).thenReturn(Optional.of(site));
        Vehicle own = car(1L, 9L, true, "AVAILABLE");
        own.setBodyType("SUV/MUV");
        own.setOwnerType("First");
        own.setDescription("One careful owner");
        own.setRegistrationAt("MH-03");
        own.setRegistrationType("Individual");
        own.setInsuranceType("Comprehensive");
        own.setSellerNote("Full service history");
        Vehicle other = car(2L, 10L, true, "AVAILABLE");
        Vehicle hidden = car(3L, 9L, false, "AVAILABLE");
        Vehicle sold = car(4L, 9L, true, "SOLD");
        when(vehicles.findByTenantId(9L)).thenReturn(List.of(own, other, hidden, sold));
        when(images.getPublicImages(1L)).thenReturn(List.of());
        var result = service().publicCars("dealer-nine");
        assertEquals(List.of(1L), result.stream().map(DealershipSiteService.PublicCar::id).toList());
        var publicCar = result.getFirst();
        assertEquals("SUV/MUV", publicCar.bodyType());
        assertEquals("First", publicCar.ownerType());
        assertEquals("One careful owner", publicCar.description());
        assertEquals("MH-03", publicCar.registrationAt());
        assertEquals("Individual", publicCar.registrationType());
        assertEquals("Comprehensive", publicCar.insuranceType());
        assertEquals("Full service history", publicCar.sellerNote());
        verify(images, never()).getPublicImages(2L);
    }

    @Test
    void unpublishedSlugDoesNotExposeCarsOrAcceptContactDetails() {
        assertThrows(ResponseStatusException.class, () -> service().publicCars("unpublished"));
        assertThrows(ResponseStatusException.class, () -> service().enquiry("unpublished",
                new DealershipSiteService.EnquiryRequest("Visitor", "1234567890", "visitor@example.test", "", "contact")));
        verifyNoInteractions(vehicles, customers, leads);
    }

    @Test
    void websiteSettingsCannotReferenceAnotherDealershipsUploadedImage() {
        TenantContext.setTenantId(9L);
        var config = new ObjectMapper().createObjectNode()
                .put("logoUrl", "/public/site-images/00000000-0000-0000-0000-000000000001");
        when(siteImages.existsByIdAndTenantId(
                java.util.UUID.fromString("00000000-0000-0000-0000-000000000001"), 9L)).thenReturn(false);

        ResponseStatusException failure = assertThrows(ResponseStatusException.class,
                () -> service().update(new DealershipSiteService.SiteUpdate("dealer-nine", "classic", config)));

        assertEquals(400, failure.getStatusCode().value());
        verifyNoInteractions(sites);
    }

    private Vehicle car(Long id, Long tenant, boolean visible, String status) {
        Vehicle v = new Vehicle();
        v.setVehicleId(id); v.setTenantId(tenant); v.setPubliclyVisible(visible);
        v.setStatus(status); v.setMake("Example"); v.setModel("Car");
        return v;
    }
}
