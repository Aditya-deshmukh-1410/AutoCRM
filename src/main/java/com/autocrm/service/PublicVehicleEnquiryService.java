package com.autocrm.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.autocrm.dto.PublicVehicleEnquiryRequest;
import com.autocrm.dto.PublicVehicleEnquiryResponse;
import com.autocrm.model.Customer;
import com.autocrm.model.Lead;
import com.autocrm.model.Vehicle;

@Service
public class PublicVehicleEnquiryService {

    private final VehicleService vehicleService;
    private final CustomerService customerService;
    private final LeadService leadService;
    private CrmNotificationService notifications;

    public PublicVehicleEnquiryService(VehicleService vehicleService, CustomerService customerService,
            LeadService leadService) {
        this.vehicleService = vehicleService;
        this.customerService = customerService;
        this.leadService = leadService;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setNotifications(CrmNotificationService notifications) { this.notifications = notifications; }

    @Transactional
    public PublicVehicleEnquiryResponse submit(Long vehicleId, PublicVehicleEnquiryRequest request) {
        Vehicle vehicle = vehicleService.getPublishedVehicleById(vehicleId);

        Customer customer = new Customer();
        customer.setName(request.name().trim());
        customer.setPhone(request.phone().trim());
        customer.setEmail(request.email().trim());
        customer.setAddress(null);
        Customer savedCustomer = customerService.createForPublicEnquiry(customer, vehicle);

        Lead lead = new Lead();
        lead.setSource("PUBLIC_SHOWROOM");
        lead.setStatus("NEW");
        lead.setInterestedVehicle(vehicle.getYear() + " " + vehicle.getMake() + " " + vehicle.getModel()
                + " (Vehicle ID " + vehicle.getVehicleId() + ")");
        Lead savedLead = leadService.createForPublicEnquiry(lead, savedCustomer, vehicle);
        if (notifications != null) {
            notifications.create(vehicle.getTenantId(), "enquiry", "New vehicle enquiry",
                    "A website visitor asked about a vehicle.", "LEAD", savedLead.getLeadId());
        }

        return new PublicVehicleEnquiryResponse("Thanks. The dealership will contact you.");
    }
}
