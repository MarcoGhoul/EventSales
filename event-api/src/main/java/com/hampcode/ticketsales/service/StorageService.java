package com.hampcode.ticketsales.service;

import com.hampcode.ticketsales.exception.InvalidRequestException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class StorageService {
    private static final long MAX_SIZE = 5 * 1024 * 1024;
    private static final Map<String, String> TYPES = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp");

    private final JdbcTemplate db;

    public StorageService(JdbcTemplate db) {
        this.db = db;
    }

    public String upload(MultipartFile file) {
        String type = file.getContentType();
        String extension = type == null ? null : TYPES.get(type);
        if (file.isEmpty() || extension == null) {
            throw new InvalidRequestException("Solo se permiten imágenes JPG, PNG o WEBP");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new InvalidRequestException("La imagen no puede pesar más de 5 MB");
        }

        String fileName = UUID.randomUUID() + extension;
        try {
            db.update("INSERT INTO event_images (name, mime_type, content) VALUES (?, ?, ?)",
                    fileName, type, file.getBytes());
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo leer la imagen", ex);
        }
        return "/api/media/" + fileName;
    }

    public ResponseEntity<byte[]> read(String name) {
        return db.query("SELECT mime_type, content FROM event_images WHERE name = ?", rs -> {
            if (!rs.next()) return ResponseEntity.notFound().<byte[]>build();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(rs.getString(1)))
                    .body(rs.getBytes(2));
        }, name);
    }
}
