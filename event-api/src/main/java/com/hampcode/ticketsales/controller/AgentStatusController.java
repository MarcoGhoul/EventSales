package com.hampcode.ticketsales.controller;

import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AgentStatusController {
    private final Environment environment;

    public AgentStatusController(Environment environment) {
        this.environment = environment;
    }

    @GetMapping("/agent/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", environment.matchesProfiles("ai"));
    }
}
