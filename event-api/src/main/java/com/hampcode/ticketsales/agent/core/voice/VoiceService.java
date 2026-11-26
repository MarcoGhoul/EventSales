package com.hampcode.ticketsales.agent.core.voice;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.Part;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Profile("ai")
@Service
public class VoiceService {
    private final Client client;
    private final String chatModel;
    private final String ttsModel;

    public VoiceService(Client client, @Value("${spring.ai.google.genai.chat.model}") String chatModel,
                        @Value("${app.voice.tts-model}") String ttsModel) {
        this.client = client;
        this.chatModel = chatModel;
        this.ttsModel = ttsModel;
    }

    public String transcribe(byte[] audio, String fileName) {
        var content = Content.fromParts(
                Part.fromText("Transcribe literalmente este audio en español. Devuelve solo la transcripción."),
                Part.fromBytes(audio, mimeType(fileName)));
        String text = client.models.generateContent(chatModel, content, null).text();
        return text == null ? "" : text.trim();
    }

    static String mimeType(String name) {
        String lower = name == null ? "" : name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".mp4") || lower.endsWith(".m4a")) return "audio/m4a";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        return "audio/webm";
    }

    public byte[] speak(String text) {
        var config = GenerateContentConfig.builder().responseModalities("AUDIO").build();
        var result = client.models.generateContent(ttsModel, "Lee exactamente el siguiente texto en español latinoamericano neutro, con pronunciación peruana natural y ritmo conversacional. Texto: " + text, config);
        for (Part part : result.parts()) {
            if (part.inlineData().isPresent()) {
                var data = part.inlineData().get();
                if (data.data().isPresent()) return wav(data.data().get());
            }
        }
        return null;
    }

    // Gemini TTS devuelve PCM mono de 16 bits a 24 kHz. El navegador consume un WAV.
    static byte[] wav(byte[] pcm) {
        ByteBuffer out = ByteBuffer.allocate(44 + pcm.length).order(ByteOrder.LITTLE_ENDIAN);
        out.put("RIFF".getBytes(StandardCharsets.US_ASCII)).putInt(36 + pcm.length);
        out.put("WAVEfmt ".getBytes(StandardCharsets.US_ASCII)).putInt(16);
        out.putShort((short) 1).putShort((short) 1).putInt(24000).putInt(48000);
        out.putShort((short) 2).putShort((short) 16);
        out.put("data".getBytes(StandardCharsets.US_ASCII)).putInt(pcm.length).put(pcm);
        return out.array();
    }
}
