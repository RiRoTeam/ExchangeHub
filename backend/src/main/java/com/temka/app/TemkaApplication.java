package com.temka.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TemkaApplication {
    public static void main(String[] args) {
        SpringApplication.run(TemkaApplication.class, args);
    }
}
