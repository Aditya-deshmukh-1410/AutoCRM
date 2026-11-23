package com.autocrm.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autocrm.model.AppUser;
import com.autocrm.model.DealershipSite;
import com.autocrm.model.DealershipSiteImage;
import com.autocrm.model.Tenant;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.DealershipSiteImageRepository;
import com.autocrm.repository.DealershipSiteRepository;
import com.autocrm.repository.TenantRepository;
import com.autocrm.security.JwtService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = { "jwt.secret=autocrm-site-image-test-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class DealershipSiteImageAccessIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired TenantRepository tenants;
    @Autowired AppUserRepository users;
    @Autowired DealershipSiteRepository sites;
    @Autowired DealershipSiteImageRepository images;
    @Autowired JwtService jwtService;

    @Test
    @Transactional
    void draftImagesAreAvailableOnlyThroughOwnerAdminPreviewUntilPublishedAndReferenced() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Tenant a = tenant("A", suffix), b = tenant("B", suffix);
        AppUser adminA = admin(a.getTenantId(), suffix + "-a");
        AppUser adminB = admin(b.getTenantId(), suffix + "-b");
        DealershipSite siteA = site(a.getTenantId(), "image-a-" + suffix, false, "{}");
        DealershipSite siteB = site(b.getTenantId(), "image-b-" + suffix, true, "{}");
        DealershipSiteImage image = image(a.getTenantId());
        String path = "/public/site-images/" + image.getId();
        siteA.setConfig("{\"heroImage\":\"" + path + "\"}");
        sites.saveAndFlush(siteA);

        mockMvc.perform(get("/api/website/images/{id}/preview", image.getId())
                .header("Authorization", bearer(jwtService.generateToken(adminA))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/website/images/{id}/preview", image.getId())
                .header("Authorization", bearer(jwtService.generateToken(adminB))))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/website/images/{id}/preview", image.getId()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get(path)).andExpect(status().isNotFound());

        siteA.setPublished(true);
        sites.saveAndFlush(siteA);
        mockMvc.perform(get(path)).andExpect(status().isOk());

        // A published site from another dealership cannot publish this tenant's asset.
        siteB.setConfig("{\"heroImage\":\"" + path + "\"}");
        sites.saveAndFlush(siteB);
        siteA.setPublished(false);
        sites.saveAndFlush(siteA);
        mockMvc.perform(get(path)).andExpect(status().isNotFound());

        siteA.setPublished(true);
        siteA.setConfig("{}");
        sites.saveAndFlush(siteA);
        mockMvc.perform(get(path)).andExpect(status().isNotFound());

        siteA.setConfig("{\"heroImage\":\"" + path + "\"}");
        sites.saveAndFlush(siteA);
        images.deleteById(image.getId());
        mockMvc.perform(get(path)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/website/images/{id}/preview", image.getId())
                .header("Authorization", bearer(jwtService.generateToken(adminA))))
                .andExpect(status().isNotFound());
    }

    private Tenant tenant(String label, String suffix) {
        Tenant tenant = new Tenant(); tenant.setName("Image Tenant " + label + " " + suffix);
        tenant.setEmail(label.toLowerCase() + "-" + suffix + "@example.test"); tenant.setPhone("9000000000");
        return tenants.saveAndFlush(tenant);
    }

    private AppUser admin(Long tenantId, String suffix) {
        AppUser user = new AppUser(); user.setName("Admin"); user.setEmail("admin-" + suffix + "@example.test");
        user.setPassword("test-password"); user.setRole("ADMIN"); user.setTenantId(tenantId);
        return users.saveAndFlush(user);
    }

    private DealershipSite site(Long tenantId, String slug, boolean published, String config) {
        DealershipSite site = new DealershipSite(); site.setTenantId(tenantId); site.setSlug(slug);
        site.setTemplateId("classic"); site.setPublished(published); site.setConfig(config);
        return sites.saveAndFlush(site);
    }

    private DealershipSiteImage image(Long tenantId) {
        DealershipSiteImage image = new DealershipSiteImage(); image.setId(UUID.randomUUID());
        image.setTenantId(tenantId); image.setContentType("image/png");
        image.setData(new byte[] { (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a });
        return images.saveAndFlush(image);
    }

    private String bearer(String token) { return "Bearer " + token; }
}
