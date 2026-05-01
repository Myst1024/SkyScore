# SkyScore

**Discover how perfectly the weather matches your preferences over the next 5 days**

SkyScore is a weather forecast application that calculates personalized "Sky Scores" based on your ideal weather conditions. Get hourly forecasts powered by NOAA National Weather Service data and see which days match your preferences best.

## Features

- **Personalized Weather Scoring**: Set your ideal temperature, humidity, wind speed, rain chance, and cloud cover ranges
- **Priority-Based Weighting**: Drag and drop weather parameters into priority sections (Highest, High, Medium, or Doesn't Matter) to customize which factors matter most
- **5-Day Hourly Forecasts**: View detailed hour-by-hour Sky Scores with interactive charts
- **NOAA Weather Data**: Accurate forecasts from the National Weather Service API
- **Location Support**: Enter a US zip code or use your current location
- **Visual Breakdown**: See how each weather parameter contributes to your overall Sky Score

## Installation

To install dependencies:

```bash
bun install
```

## Development

To start a development server:

```bash
bun dev
```

## Production

To run for production:

```bash
bun start
```

To build for production:

```bash
bun run build
```

## Technology Stack

- **Runtime**: [Bun](https://bun.com) - Fast all-in-one JavaScript runtime
- **Framework**: React 19 with TypeScript
- **UI Components**: Radix UI primitives with Tailwind CSS 4
- **Charts**: Recharts for data visualization
- **Drag & Drop**: dnd-kit for priority management
- **Weather Data**: NOAA National Weather Service API

## How It Works

1. **Enter your location**: Provide a US zip code or use browser geolocation
2. **Set preferences**: Adjust min/max ranges for each weather parameter
3. **Organize priorities**: Drag parameters into priority sections to weight their importance
4. **View your forecast**: See hourly Sky Scores calculated based on your preferences
5. **Find the best times**: Identify when the weather will match your ideal conditions

## Sky Score Calculation

Each weather parameter is scored from 0-100 based on how closely it matches your preferred range. Parameters are weighted by priority section:

- **Highest Priority**: 2.0x weight
- **High Priority**: 1.0x weight
- **Medium Priority**: 0.4x weight
- **Doesn't Matter**: 0x weight (no impact)

The final Sky Score is the weighted average of all parameter scores.

## License

This project was created using `bun init` in bun v1.3.13.
