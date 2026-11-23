package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autocrm.dto.PublicSellCarRequest;
import com.autocrm.model.AppUser;
import com.autocrm.model.CrmNotification;
import com.autocrm.model.Customer;
import com.autocrm.model.DealershipSite;
import com.autocrm.model.Lead;
import com.autocrm.model.Tenant;
import com.autocrm.model.WebsiteSellPhoto;
import com.autocrm.model.WebsiteSellRequest;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.CrmNotificationRepository;
import com.autocrm.repository.CustomerRepository;
import com.autocrm.repository.DealershipSiteRepository;
import com.autocrm.repository.LeadRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.WebsiteSellPhotoRepository;
import com.autocrm.repository.WebsiteSellRequestRepository;
import com.autocrm.security.JwtService;
import com.autocrm.service.PublicWebsiteSellService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = { "jwt.secret=autocrm-website-isolation-test-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class WebsiteTenantIsolationIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired TenantRepository tenants;
    @Autowired AppUserRepository users;
    @Autowired CustomerRepository customers;
    @Autowired LeadRepository leads;
    @Autowired WebsiteSellRequestRepository sellRequests;
    @Autowired WebsiteSellPhotoRepository sellPhotos;
    @Autowired CrmNotificationRepository notifications;
    @Autowired DealershipSiteRepository sites;
    @Autowired PublicWebsiteSellService publicSellService;
    @Autowired JwtService jwtService;

    @Test
    @Transactional
    void adminAndSalesCannotListUpdateAssignOrDownloadAnotherDealershipsSellerWork() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Tenant a = tenant("A", suffix), b = tenant("B", suffix);
        AppUser adminA = user("admin-a", "ADMIN", a.getTenantId(), suffix);
        AppUser salesA = user("sales-a", "SALES", a.getTenantId(), suffix);
        String adminToken = bearer(jwtService.generateToken(adminA));
        String salesToken = bearer(jwtService.generateToken(salesA));
        SellFixture requestA = sellRequest(a.getTenantId(), "a", suffix);
        SellFixture requestB = sellRequest(b.getTenantId(), "b", suffix);
        CrmNotification notificationA = notification(a.getTenantId(), "A notification");
        CrmNotification notificationB = notification(b.getTenantId(), "B notification");

        mockMvc.perform(get("/api/crm/sell-requests").header("Authorization", salesToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(requestA.lead().getLeadId().toString()))
                .andExpect(jsonPath("$[1]").doesNotExist());
        mockMvc.perform(get("/api/website/sell-requests/{id}/photos", requestA.lead().getLeadId())
                .header("Authorization", salesToken)).andExpect(status().isOk());
        mockMvc.perform(get("/api/website/sell-requests/{leadId}/photos/{photoId}",
                requestA.lead().getLeadId(), requestA.photo().getId()).header("Authorization", salesToken))
                .andExpect(status().isOk()).andExpect(content -> assertEquals("image/png",
                        content.getResponse().getContentType()));

        for (String token : List.of(adminToken, salesToken)) {
            mockMvc.perform(put("/api/crm/sell-requests/{id}/status", requestB.lead().getLeadId())
                    .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"status\":\"PURCHASED\"}")).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/website/sell-requests/{id}/photos", requestB.lead().getLeadId())
                    .header("Authorization", token)).andExpect(status().isNotFound());
            mockMvc.perform(get("/api/website/sell-requests/{leadId}/photos/{photoId}",
                    requestB.lead().getLeadId(), requestB.photo().getId()).header("Authorization", token))
                    .andExpect(status().isNotFound());
        }

        mockMvc.perform(put("/api/leads/{id}/assignment", requestB.lead().getLeadId())
                .header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"assigneeId\":" + salesA.getUserId() + "}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/leads/{id}/assignment", requestA.lead().getLeadId())
                .header("Authorization", salesToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"assigneeId\":" + salesA.getUserId() + "}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/crm/notifications").header("Authorization", salesToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].title").value("A notification"))
                .andExpect(jsonPath("$.items[1]").doesNotExist());
        mockMvc.perform(put("/api/crm/notifications/{id}/read", notificationB.getId())
                .header("Authorization", salesToken)).andExpect(status().isNotFound());
        mockMvc.perform(put("/api/crm/notifications/read-all").header("Authorization", adminToken))
                .andExpect(status().isOk());
        assertTrue(notifications.findById(notificationA.getId()).orElseThrow().isRead());
        assertFalse(notifications.findById(notificationB.getId()).orElseThrow().isRead());
        assertEquals("NEW", sellRequests.findById(requestB.lead().getLeadId()).orElseThrow().getStatus());
    }

    @Test
    @Transactional
    void publicSellSubmissionUsesPublishedSitesDealershipTenant() {
        String suffix = UUID.randomUUID().toString();
        Tenant a = tenant("Public A", suffix), b = tenant("Public B", suffix);
        DealershipSite siteA = site(a.getTenantId(), "public-a-" + suffix);
        site(a.getTenantId(), "public-b-" + suffix);

        Long leadId = publicSellService.submit(siteA.getSlug(), new PublicSellCarRequest(
                "Visitor", "9000000000", "visitor@example.test", "Make", "Model", null, 2020,
                null, null, null, "Pune", null, null, 0, null, null, null,
                false, false, null, null, null, null, null, null), List.of());

        assertTrue(leads.findByLeadIdAndTenantId(leadId, a.getTenantId()).isPresent());
        assertFalse(leads.findByLeadIdAndTenantId(leadId, b.getTenantId()).isPresent());
        assertEquals(a.getTenantId(), sellRequests.findByLeadIdAndTenantId(leadId, a.getTenantId())
                .orElseThrow().getTenantId());
        assertTrue(notifications.findTop100ByTenantIdOrderByCreatedAtDesc(a.getTenantId()).stream()
                .anyMatch(item -> Long.valueOf(leadId).equals(item.getEntityId())));
        assertTrue(notifications.findTop100ByTenantIdOrderByCreatedAtDesc(b.getTenantId()).isEmpty());
    }

    private Tenant tenant(String label, String suffix) {
        Tenant tenant = new Tenant();
        tenant.setName("Tenant " + label + " " + suffix);
        tenant.setEmail(label.toLowerCase() + "-" + suffix + "@example.test");
        tenant.setPhone("9000000000");
        return tenants.saveAndFlush(tenant);
    }

    private AppUser user(String label, String role, Long tenantId, String suffix) {
        AppUser user = new AppUser();
        user.setName(label); user.setEmail(label + "-" + suffix + "@example.test");
        user.setPassword("unused-test-password"); user.setRole(role); user.setTenantId(tenantId);
        return users.saveAndFlush(user);
    }

    private SellFixture sellRequest(Long tenantId, String label, String suffix) {
        Customer customer = new Customer(); customer.setName("Seller " + label);
        customer.setPhone("9000000000"); customer.setEmail(label + "-" + suffix + "@example.test");
        customer.setTenantId(tenantId); customer = customers.saveAndFlush(customer);
        Lead lead = new Lead(); lead.setSource("PUBLIC_SELL_REQUEST"); lead.setStatus("NEW");
        lead.setInterestedVehicle("Seller vehicle " + label); lead.setCustomerId(customer.getCustomerId());
        lead.setTenantId(tenantId); lead = leads.saveAndFlush(lead);
        WebsiteSellRequest request = new WebsiteSellRequest(); request.setLeadId(lead.getLeadId());
        request.setTenantId(tenantId); request.setDetails("{\"name\":\"Seller\",\"phone\":\"9000000000\","
                + "\"carMake\":\"Make\",\"carModel\":\"Model\",\"carYear\":2020,\"city\":\"Pune\"}");
        request.setStatus("NEW"); request.setCreatedAt(Instant.now()); sellRequests.saveAndFlush(request);
        WebsiteSellPhoto photo = new WebsiteSellPhoto(); photo.setId(UUID.randomUUID());
        photo.setLeadId(lead.getLeadId()); photo.setTenantId(tenantId); photo.setContentType("image/png");
        photo.setData(new byte[] { (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a });
        return new SellFixture(lead, sellPhotos.saveAndFlush(photo));
    }

    private CrmNotification notification(Long tenantId, String title) {
        CrmNotification notification = new CrmNotification(); notification.setId(UUID.randomUUID());
        notification.setTenantId(tenantId); notification.setType("enquiry"); notification.setTitle(title);
        notification.setMessage(title); notification.setRead(false); notification.setCreatedAt(Instant.now());
        return notifications.saveAndFlush(notification);
    }

    private DealershipSite site(Long tenantId, String slug) {
        DealershipSite site = new DealershipSite(); site.setTenantId(tenantId); site.setSlug(slug);
        site.setPublished(true); site.setConfig("{}"); return sites.saveAndFlush(site);
    }

    private String bearer(String token) { return "Bearer " + token; }

    private record SellFixture(Lead lead, WebsiteSellPhoto photo) {}
}
