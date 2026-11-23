package com.autocrm.controller;

import com.autocrm.service.DealershipSiteService;
import com.autocrm.service.DealershipSiteService.*;
import com.autocrm.service.PublicTestDriveBookingService;
import com.autocrm.dto.PublicTestDriveBookingRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class DealershipSiteController {
    private final DealershipSiteService sites;
    private final PublicTestDriveBookingService bookings;
    public DealershipSiteController(DealershipSiteService sites, PublicTestDriveBookingService bookings) {
        this.sites = sites; this.bookings = bookings;
    }
    @GetMapping("/api/website")
    @PreAuthorize("hasRole('ADMIN')")
    public SiteResponse get() { return sites.ownerSite(); }
    @GetMapping("/api/website/cars")
    @PreAuthorize("hasRole('ADMIN')")
    public List<PublicCar> previewCars() { return sites.previewCars(); }
    @PutMapping("/api/website")
    @PreAuthorize("hasRole('ADMIN')")
    public SiteResponse update(@Valid @RequestBody SiteUpdate req) { return sites.update(req); }
    @PostMapping("/api/website/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public SiteResponse publish(@RequestBody Map<String, Boolean> body) {
        return sites.publish(Boolean.TRUE.equals(body.get("published")));
    }
    @GetMapping("/public/{slug}")
    public PublicSiteResponse publicSite(@PathVariable String slug) { return sites.publicSite(slug); }
    @GetMapping("/public/{slug}/cars")
    public List<PublicCar> cars(@PathVariable String slug) { return sites.publicCars(slug); }
    @GetMapping("/public/{slug}/cars/{id}")
    public PublicCar car(@PathVariable String slug, @PathVariable Long id) { return sites.publicCar(slug, id); }
    @PostMapping("/public/{slug}/enquiry")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> enquiry(@PathVariable String slug, @Valid @RequestBody EnquiryRequest req) {
        sites.enquiry(slug, req);
        return Map.of("message", "Enquiry submitted");
    }
    public record Booking(@jakarta.validation.constraints.NotBlank String name,
            @jakarta.validation.constraints.NotBlank String phone,
            @jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email,
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long carId,
            @jakarta.validation.constraints.NotNull LocalDate preferredDate,
            @jakarta.validation.constraints.NotBlank String preferredTime) {}
    @PostMapping("/public/{slug}/test-drive")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> testDrive(@PathVariable String slug, @Valid @RequestBody Booking req) {
        PublicCar car = sites.publicCar(slug, req.carId());
        if (car.id() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        LocalTime time;
        try { time = LocalTime.parse(req.preferredTime()); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid time"); }
        if (!LocalDateTime.of(req.preferredDate(), time).isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a future appointment");
        }
        bookings.submit(req.carId(), new PublicTestDriveBookingRequest(req.name(), req.phone(),
                req.email(), LocalDateTime.of(req.preferredDate(), time)));
        return Map.of("message", "Test drive requested");
    }
}
