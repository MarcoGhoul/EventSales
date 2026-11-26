package com.hampcode.ticketsales.controller;

import com.hampcode.ticketsales.dto.response.ImageResponseDTO;
import com.hampcode.ticketsales.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController

@RequiredArgsConstructor
public class ImageController {
    private final StorageService storageService;

    @GetMapping("/media/{name}")
    public ResponseEntity<byte[]> read(@PathVariable String name) {
        return storageService.read(name);
    }

    @PreAuthorize("hasRole('ORGANIZER')")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImageResponseDTO> upload(@RequestParam("file") MultipartFile file) {
        String url = storageService.upload(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ImageResponseDTO(url));
    }
}
