package com.autocrm.controller;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.CRC32;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.model.AppUser;
import com.autocrm.model.Tenant;
import com.autocrm.model.Vehicle;
import com.autocrm.repository.TenantRepository;
import com.autocrm.repository.AppUserRepository;
import com.autocrm.repository.VehicleImageRepository;
import com.autocrm.repository.VehicleRepository;
import com.autocrm.security.JwtService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(properties = { "jwt.secret=autocrm-integration-test-only-secret-key-0123456789abcdef",
        "spring.jpa.show-sql=false", "logging.level.root=ERROR" })
@AutoConfigureMockMvc
class VehiclePublicationAndPublicImageIntegrationTest {

    @TempDir
    private static Path imageStorage;

    @DynamicPropertySource
    static void configureImageStorage(DynamicPropertyRegistry registry) {
        registry.add("autocrm.vehicle-images.storage-directory",
                () -> imageStorage.resolve("vehicle-images").toAbsolutePath().toString());
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private VehicleImageRepository vehicleImageRepository;

    @Autowired
    private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @Transactional
    void imageDimensionsAndPixelCountAreCheckedBeforeDecoding() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Long tenantId = createTenant("Image Limits", suffix);
        Vehicle vehicle = saveVehicle(tenantId, "Limits", suffix);
        String token = adminToken("image-limits-" + suffix + "@example.test", tenantId);
        long imagesBefore = vehicleImageRepository.countByVehicleIdAndTenantId(vehicle.getVehicleId(), tenantId);

        uploadImage(vehicle.getVehicleId(), token, pngWithDimensions(6001, 1), 413);
        uploadImage(vehicle.getVehicleId(), token, pngWithDimensions(5000, 5000), 413);

        assertEquals(imagesBefore,
                vehicleImageRepository.countByVehicleIdAndTenantId(vehicle.getVehicleId(), tenantId));
    }

    @Test
    @Transactional
    void normalValidImageStillUploadsSuccessfully() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Long tenantId = createTenant("Valid Image", suffix);
        Vehicle vehicle = saveVehicle(tenantId, "Valid", suffix);
        String token = adminToken("valid-image-" + suffix + "@example.test", tenantId);

        long imageId = uploadImage(vehicle.getVehicleId(), token, tinyPng());

        assertTrue(vehicleImageRepository.findById(imageId).isPresent());
        assertEquals(1, vehicleImageRepository.countByVehicleIdAndTenantId(vehicle.getVehicleId(), tenantId));
    }

    @Test
    @Transactional
    void publicationAndPublicImagesAreTenantScopedAndFollowPublicationState() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Long tenantAId = createTenant("Publication A", suffix);
        Long tenantBId = createTenant("Publication B", suffix);
        Vehicle vehicleA = saveVehicle(tenantAId, "Target", suffix);
        Vehicle vehicleB = saveVehicle(tenantBId, "Other", suffix);
        String tokenA = adminToken("admin-a-" + suffix + "@example.test", tenantAId);
        String tokenB = adminToken("admin-b-" + suffix + "@example.test", tenantBId);
        byte[] png = tinyPng();

        long vehicleAImageId = uploadImage(vehicleA.getVehicleId(), tokenA, png);
        long vehicleBImageId = uploadImage(vehicleB.getVehicleId(), tokenB, png);

        mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images", vehicleA.getVehicleId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images/{imageId}",
                vehicleA.getVehicleId(), vehicleAImageId)).andExpect(status().isNotFound());
        assertListed(vehicleA.getVehicleId(), false);

        // Tenant B cannot publish Tenant A's vehicle.
        mockMvc.perform(put("/api/vehicles/{vehicleId}/publication", vehicleA.getVehicleId())
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON).content("{\"publiclyVisible\":true}"))
                .andExpect(status().isNotFound());
        assertFalse(vehicleRepository.findById(vehicleA.getVehicleId()).orElseThrow().isPubliclyVisible());

        // The owning dealership ADMIN publishes it.
        mockMvc.perform(put("/api/vehicles/{vehicleId}/publication", vehicleA.getVehicleId())
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"publiclyVisible\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publiclyVisible").value(true));
        assertListed(vehicleA.getVehicleId(), true);

        MvcResult metadata = mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images", vehicleA.getVehicleId()))
                .andExpect(status().isOk()).andReturn();
        List<Map<String, Object>> images = objectMapper.readValue(metadata.getResponse().getContentAsString(),
                new TypeReference<>() {});
        assertTrue(images.stream().anyMatch(image ->
                ((Number) image.get("vehicleImageId")).longValue() == vehicleAImageId));

        MvcResult imageBytes = mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images/{imageId}",
                vehicleA.getVehicleId(), vehicleAImageId)).andExpect(status().isOk()).andReturn();
        assertEquals("image/png", imageBytes.getResponse().getContentType());
        assertArrayEquals(png, imageBytes.getResponse().getContentAsByteArray());

        // Publish the second vehicle too, so both mismatched ownership cases exercise published image routes.
        mockMvc.perform(put("/api/vehicles/{vehicleId}/publication", vehicleB.getVehicleId())
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON).content("{\"publiclyVisible\":true}"))
                .andExpect(status().isOk());
        assertListed(vehicleB.getVehicleId(), true);

        // A published vehicle cannot be paired with an image belonging to another vehicle/tenant.
        mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images/{imageId}",
                vehicleA.getVehicleId(), vehicleBImageId)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images/{imageId}",
                vehicleB.getVehicleId(), vehicleAImageId)).andExpect(status().isNotFound());

        // Tenant B cannot unpublish Tenant A's vehicle; the owning ADMIN can.
        mockMvc.perform(put("/api/vehicles/{vehicleId}/publication", vehicleA.getVehicleId())
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON).content("{\"publiclyVisible\":false}"))
                .andExpect(status().isNotFound());
        assertTrue(vehicleRepository.findById(vehicleA.getVehicleId()).orElseThrow().isPubliclyVisible());

        mockMvc.perform(put("/api/vehicles/{vehicleId}/publication", vehicleA.getVehicleId())
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"publiclyVisible\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publiclyVisible").value(false));
        assertFalse(vehicleRepository.findById(vehicleA.getVehicleId()).orElseThrow().isPubliclyVisible());
        assertListed(vehicleA.getVehicleId(), false);
        mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images", vehicleA.getVehicleId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/vehicles/{vehicleId}/images/{imageId}",
                vehicleA.getVehicleId(), vehicleAImageId)).andExpect(status().isNotFound());

        mockMvc.perform(put("/api/vehicles/{vehicleId}/publication", vehicleB.getVehicleId())
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON).content("{\"publiclyVisible\":false}"))
                .andExpect(status().isOk());
        assertListed(vehicleB.getVehicleId(), false);

        // Publication does not alter inventory status.
        assertEquals("AVAILABLE", vehicleRepository.findById(vehicleA.getVehicleId()).orElseThrow().getStatus());
    }

    private void assertListed(Long vehicleId, boolean expected) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/vehicles")).andExpect(status().isOk()).andReturn();
        List<Map<String, Object>> vehicles = objectMapper.readValue(result.getResponse().getContentAsString(),
                new TypeReference<>() {});
        boolean present = vehicles.stream().anyMatch(vehicle ->
                ((Number) vehicle.get("vehicleId")).longValue() == vehicleId);
        assertEquals(expected, present, "publication state should control this test vehicle's public listing");
        if (present) {
            JsonNode vehicle = objectMapper.valueToTree(vehicles.stream()
                    .filter(item -> ((Number) item.get("vehicleId")).longValue() == vehicleId)
                    .findFirst().orElseThrow());
            assertFalse(vehicle.has("tenantId"));
            assertFalse(vehicle.has("registrationNumber"));
        }
    }

    private long uploadImage(Long vehicleId, String token, byte[] png) throws Exception {
        return uploadImage(vehicleId, token, png, 201);
    }

    private long uploadImage(Long vehicleId, String token, byte[] png, int expectedStatus) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", png);
        MvcResult result = mockMvc.perform(multipart("/api/vehicles/{vehicleId}/images", vehicleId)
                .file(file).header("Authorization", "Bearer " + token))
                .andExpect(status().is(expectedStatus)).andReturn();
        if (expectedStatus != 201) return -1;
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("vehicleImageId").asLong();
    }

    private Long createTenant(String name, String suffix) {
        Tenant tenant = new Tenant();
        tenant.setName(name);
        tenant.setEmail(name.toLowerCase().replace(' ', '-') + "-" + suffix + "@example.test");
        tenant.setPhone("9000000000");
        return tenantRepository.saveAndFlush(tenant).getTenantId();
    }

    private Vehicle saveVehicle(Long tenantId, String label, String suffix) {
        Vehicle vehicle = new Vehicle();
        vehicle.setMake("Integration " + label);
        vehicle.setModel("Publication Test");
        vehicle.setYear(2026);
        vehicle.setFuelType("PETROL");
        vehicle.setTransmission("MANUAL");
        vehicle.setKilometers(1000);
        vehicle.setPrice(new BigDecimal("1250000"));
        vehicle.setRegistrationNumber("PUB-" + label + "-" + suffix);
        vehicle.setStatus("AVAILABLE");
        vehicle.setTenantId(tenantId);
        return vehicleRepository.saveAndFlush(vehicle);
    }

    private String adminToken(String email, Long tenantId) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setRole("ADMIN");
        user.setTenantId(tenantId);
        user.setName("Publication Admin");
        user.setPassword("unused-publication-password");
        return jwtService.generateToken(appUserRepository.saveAndFlush(user));
    }

    private byte[] tinyPng() throws Exception {
        BufferedImage image = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        image.flush();
        return output.toByteArray();
    }

    private byte[] pngWithDimensions(int width, int height) throws Exception {
        byte[] png = tinyPng();
        writeBigEndianInt(png, 16, width);
        writeBigEndianInt(png, 20, height);

        CRC32 crc = new CRC32();
        crc.update(png, 12, 17);
        writeBigEndianInt(png, 29, (int) crc.getValue());
        return png;
    }

    private void writeBigEndianInt(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) (value >>> 24);
        bytes[offset + 1] = (byte) (value >>> 16);
        bytes[offset + 2] = (byte) (value >>> 8);
        bytes[offset + 3] = (byte) value;
    }
}
