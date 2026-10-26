#pragma once

#include <cmath>
#include <limits>

inline constexpr double PI = 3.14159265358979323846;

struct PendulumState {
    double angleRadians;
    double angularVelocity;
};

inline double CalculatePeriod(double length, double gravity) {
    return 2.0 * PI * std::sqrt(length / gravity);
}

inline PendulumState calculateState(PendulumState state, double gravity,
                                    double length, double dt) {
    const double acceleration = -gravity * std::sin(state.angleRadians) / length;
    state.angularVelocity += acceleration * dt;
    state.angleRadians += state.angularVelocity * dt;
    return state;
}

struct PeriodMeasurement {
    bool hasPreviousCrossing = false;
    double previousCrossingTime = 0.0;
    double totalPeriodSeconds = 0.0;
    int count = 0;

    double record(double previousAngle, double angle, double time, double dt) {
        if (!(previousAngle > 0.0 && angle <= 0.0)) {
            return 0.0;
        }
        const double fraction = previousAngle / (previousAngle - angle);
        const double crossing = time - dt + fraction * dt;
        const double period = hasPreviousCrossing ? crossing - previousCrossingTime : 0.0;
        if (hasPreviousCrossing) {
            totalPeriodSeconds += period;
            ++count;
        }
        previousCrossingTime = crossing;
        hasPreviousCrossing = true;
        return period;
    }

    double mean() const {
        return count > 0 ? totalPeriodSeconds / count
                         : std::numeric_limits<double>::quiet_NaN();
    }
};
