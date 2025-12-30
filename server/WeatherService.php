<?php
// server/WeatherService.php

class WeatherService {

    public function getWeatherByIp(?string $ip = null): ?array {
        if (!$ip) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        }

        if (!$ip || $ip === '127.0.0.1' || $ip === '::1') {
            // Default to Moscow for local/development
            $lat = 55.7558;
            $lon = 37.6173;
            $city = 'Москва';
        } else {
            // Get location from IP
            $location = $this->getLocationFromIp($ip);
            if (!$location) {
                return null;
            }
            $lat = $location['lat'];
            $lon = $location['lon'];
            $city = $location['city'];
        }

        // Get weather data
        $weatherData = $this->getWeatherData($lat, $lon);
        if (!$weatherData) {
            return null;
        }

        return [
            'type' => 'weather',
            'city' => $city,
            'temperature' => $weatherData['temperature'],
            'wind' => $weatherData['wind'],
            'humidity' => $weatherData['humidity'],
            'precipitation' => $weatherData['precipitation']
        ];
    }

    private function getLocationFromIp(string $ip): ?array {
        try {
            // Use ipapi.co for geolocation (free, no API key)
            $url = "https://ipapi.co/{$ip}/json/";

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Murmuration Weather Bot');

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200 || !$response) {
                return null;
            }

            $data = json_decode($response, true);

            if (!$data || !isset($data['latitude'], $data['longitude'])) {
                return null;
            }

            return [
                'lat' => $data['latitude'],
                'lon' => $data['longitude'],
                'city' => $data['city'] ?? 'Unknown'
            ];
        } catch (Exception $e) {
            error_log("Weather service location error: " . $e->getMessage());
            return null;
        }
    }

    private function getWeatherData(float $lat, float $lon): ?array {
        try {
            // Use Open-Meteo API (free, no API key required)
            $url = "https://api.open-meteo.com/v1/forecast?" . http_build_query([
                'latitude' => $lat,
                'longitude' => $lon,
                'current' => 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weathercode',
                'timezone' => 'auto'
            ]);

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Murmuration Weather Bot');

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200 || !$response) {
                return null;
            }

            $data = json_decode($response, true);

            if (!$data || !isset($data['current'])) {
                return null;
            }

            $current = $data['current'];
            $weatherCode = $current['weathercode'] ?? 0;
            $icon = $this->getWeatherIcon($weatherCode);

            error_log("Weather API response - code: $weatherCode, icon: $icon");

            return [
                'temperature' => round($current['temperature_2m']),
                'wind' => round($current['wind_speed_10m']),
                'humidity' => round($current['relative_humidity_2m']),
                'precipitation' => round($current['precipitation']),
                'icon' => $icon
            ];
        } catch (Exception $e) {
            error_log("Weather service data error: " . $e->getMessage());
            return null;
        }
    }

    private function getWeatherIcon(int $code): string {
        // WMO Weather interpretation codes
        // https://open-meteo.com/en/docs
        if ($code === 0) {
            return '☀️'; // Clear sky
        } elseif ($code >= 1 && $code <= 3) {
            return '⛅'; // Partly cloudy
        } elseif ($code >= 45 && $code <= 48) {
            return '🌫️'; // Fog
        } elseif ($code >= 51 && $code <= 55) {
            return '🌦️'; // Drizzle
        } elseif ($code >= 56 && $code <= 57) {
            return '🌧️'; // Freezing drizzle
        } elseif ($code >= 61 && $code <= 65) {
            return '🌧️'; // Rain
        } elseif ($code >= 66 && $code <= 67) {
            return '🌧️'; // Freezing rain
        } elseif ($code >= 71 && $code <= 75) {
            return '🌨️'; // Snow fall
        } elseif ($code === 77) {
            return '🌨️'; // Snow grains
        } elseif ($code >= 80 && $code <= 82) {
            return '🌧️'; // Rain showers
        } elseif ($code >= 85 && $code <= 86) {
            return '🌨️'; // Snow showers
        } elseif ($code === 95) {
            return '⛈️'; // Thunderstorm
        } elseif ($code >= 96 && $code <= 99) {
            return '⛈️'; // Thunderstorm with hail
        }
        return '🌤️'; // Default
    }
}
