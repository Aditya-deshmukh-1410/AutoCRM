package com.autocrm;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "jwt.secret=autocrm-context-test-only-secret-key-0123456789abcdef")
class AutoCrmApplicationTests {

    @Test
    void contextLoads() {
    }

}
