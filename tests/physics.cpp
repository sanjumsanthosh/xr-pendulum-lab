#include "../pendulum.hpp"
#include <cassert>
#include <iostream>

double measure(double degrees, double length, double dt) {
    PendulumState state{degrees * PI / 180.0, 0.0};
    PeriodMeasurement periods;
    for (int i = 1; i <= static_cast<int>(20.0 / dt); ++i) {
        const double previous = state.angleRadians;
        state = calculateState(state, 9.8, length, dt);
        assert(std::isfinite(state.angleRadians));
        assert(std::abs(state.angleRadians) < std::abs(degrees * PI / 180.0) + 0.005);
        periods.record(previous, state.angleRadians, i * dt, dt);
    }
    assert(periods.count >= 4);
    return periods.mean();
}

int main() {
    const double small = measure(10.0, 1.0, 0.005);
    const double large = measure(30.0, 1.0, 0.005);
    assert(std::abs(small - CalculatePeriod(1.0, 9.8)) < 0.005);
    assert(large > small);
    assert(std::abs(large - measure(30.0, 1.0, 0.01)) < 0.001);
    assert(std::abs(measure(10.0, 2.0, 0.005) / small - std::sqrt(2.0)) < 0.001);
    PeriodMeasurement stationary;
    assert(std::isnan(stationary.mean()));
    assert(stationary.record(0.0, 0.0, 1.0, 0.005) == 0.0);
    assert(stationary.record(-0.1, 0.1, 1.0, 0.005) == 0.0);
    assert(stationary.count == 0);
    std::cout << "Native physics checks passed.\n";
}
