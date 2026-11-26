package com.hampcode.ticketsales.agent.core.voice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.ClassPathResource;
import static org.junit.jupiter.api.Assertions.*;

class VoiceConfigurationTest {
    @Test
    void geminiDimensionsMatchPostgres() throws Exception {
        var config = new YamlPropertySourceLoader().load("ai", new ClassPathResource("application-ai.yml")).getFirst();
        assertEquals(config.getProperty("spring.ai.google.genai.embedding.text.dimensions"),
                config.getProperty("spring.ai.vectorstore.pgvector.dimensions"));
        assertEquals("gemini-embedding-2", config.getProperty("spring.ai.google.genai.embedding.text.model"));
    }
}
