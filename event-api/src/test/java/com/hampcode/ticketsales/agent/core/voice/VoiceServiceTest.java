package com.hampcode.ticketsales.agent.core.voice;

import org.junit.jupiter.api.Test;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;
import static org.junit.jupiter.api.Assertions.*;

class VoiceServiceTest {
    @Test
    void recognizesBrowserContainers() {
        assertEquals("audio/m4a", VoiceService.mimeType("audio.mp4"));
        assertEquals("audio/ogg", VoiceService.mimeType("audio.ogg"));
        assertEquals("audio/webm", VoiceService.mimeType(null));
    }

    @Test
    void wrapsPcmWithoutAlteringSamples() {
        byte[] pcm = {1, 2, 3, 4};
        byte[] wav = VoiceService.wav(pcm);
        var header = ByteBuffer.wrap(wav).order(ByteOrder.LITTLE_ENDIAN);
        assertEquals(24000, header.getInt(24));
        assertEquals(4, header.getInt(40));
        assertArrayEquals(pcm, Arrays.copyOfRange(wav, 44, wav.length));
    }
}
