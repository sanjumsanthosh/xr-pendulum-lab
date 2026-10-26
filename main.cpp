//
// Created by Sanjay M Santhosh on 24/10/26.
//

#include "pendulum.hpp"
#include <iostream>

int main() {

    const double gravity = 9.8;
    const double shortLenght = 1;
    const double longLenght = 2;
    const double initalAngleDegree = 30;

    const double shortPeriod = CalculatePeriod(shortLenght, gravity);
    const double longPeriod = CalculatePeriod(longLenght, gravity);

    std::cout << "Short period : " << shortPeriod << std::endl;
    std::cout << "Long period : " << longPeriod << std::endl;
    std::cout << "Ratio : "<< longPeriod / shortPeriod << std::endl;


    // capturing motion
    const PendulumState initialState{
        PI * initalAngleDegree / 180.0,
        0.0
    };

    PendulumState state = initialState;
    const double dt = 0.01;
    const int totalSteps = 1000;

    PeriodMeasurement measurement;

    for (int step = 1; step <= totalSteps; ++step) {
        const double previousAngle = state.angleRadians;
        state = calculateState(state, gravity, shortLenght, dt);
        const double timeSeconds = step * dt;

        const double periodSeconds = measurement.record(
            previousAngle, state.angleRadians, timeSeconds, dt);
        if (periodSeconds > 0.0) {
            std::cout << "Measured period " << measurement.count
                      << ": " << periodSeconds << " s\n";
        }

        std::cout << timeSeconds
                  << " | Angle (rad): " << state.angleRadians
                  << " | Angular velocity (rad/s): " << state.angularVelocity
                  << '\n';
    }

    if (measurement.count == 0) {
        std::cerr << "Not enough crossings to measure a complete period.\n";
        return 1;
    }

    const double measuredPeriod = measurement.mean();
    const double differencePercent =
        std::abs(measuredPeriod - shortPeriod) / shortPeriod * 100.0;

    std::cout << "\nCompleted periods: " << measurement.count << '\n';
    std::cout << "Predicted period (small-angle): " << shortPeriod << " s\n";
    std::cout << "Mean measured period: " << measuredPeriod << " s\n";
    std::cout << "Difference from prediction: " << differencePercent << "%\n";

    return 0;
}
