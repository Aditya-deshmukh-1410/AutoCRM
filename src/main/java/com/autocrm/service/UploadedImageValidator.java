package com.autocrm.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

/** Validates image bytes by decoding them, rather than trusting a multipart Content-Type header. */
public final class UploadedImageValidator {
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "jpeg", "image/jpeg", "jpg", "image/jpeg", "png", "image/png", "webp", "image/webp");

    private UploadedImageValidator() {}

    public static String validate(byte[] bytes, String declaredContentType, int maxDimension, long maxPixels) {
        if (bytes == null || bytes.length == 0 || maxDimension < 1 || maxPixels < 1) {
            throw invalidImage();
        }
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) throw invalidImage();
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                String contentType = CONTENT_TYPES.get(format);
                if (contentType == null || declaredContentType == null
                        || !contentType.equalsIgnoreCase(declaredContentType.trim())) throw invalidImage();
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > maxDimension || height > maxDimension
                        || (long) width * height > maxPixels) {
                    throw new IllegalArgumentException("Image dimensions exceed the allowed limit.");
                }
                BufferedImage decoded = reader.read(0);
                if (decoded == null) throw invalidImage();
                decoded.flush();
                return contentType;
            } finally {
                reader.dispose();
            }
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw invalidImage();
        }
    }

    private static IllegalArgumentException invalidImage() {
        return new IllegalArgumentException("Upload a valid, readable JPEG, PNG, or WebP image.");
    }
}
