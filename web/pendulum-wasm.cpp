#include "../pendulum.hpp"
#include <algorithm>
#include <array>

namespace {
struct Experiment {
    double length = 1.0;
    double gravity = 9.8;
    double time = 0.0;
    bool held = false;
    PendulumState state{0.0, 0.0};
    PeriodMeasurement measurement;
};

std::array<Experiment, 2> experiments;
bool validId(int id) { return id >= 0 && id < 2; }
double invalid() { return std::numeric_limits<double>::quiet_NaN(); }
}

// A numeric C interface lets JavaScript call the same C++ physics as main.cpp.
extern "C" {
int lab_reset(int id, double length, double gravity, double angleDegrees) {
    if (!validId(id) || !std::isfinite(length) || length < 0.3 || length > 2.0 ||
        !std::isfinite(gravity) || gravity < 1.0 || gravity > 20.0 ||
        !std::isfinite(angleDegrees) || std::abs(angleDegrees) > 80.0) {
        return 0;
    }
    experiments[id] = Experiment{};
    experiments[id].length = length;
    experiments[id].gravity = gravity;
    experiments[id].state.angleRadians = angleDegrees * PI / 180.0;
    return 1;
}

int lab_step(double dt) {
    if (!std::isfinite(dt) || dt <= 0.0 || dt > 0.02) return 0;
    for (auto& experiment : experiments) {
        if (experiment.held) continue;
        const double previous = experiment.state.angleRadians;
        experiment.state = calculateState(experiment.state, experiment.gravity,
                                          experiment.length, dt);
        experiment.time += dt;
        experiment.measurement.record(previous, experiment.state.angleRadians,
                                       experiment.time, dt);
    }
    return 1;
}

int lab_hold(int id, double angleRadians) {
    if (!validId(id) || !std::isfinite(angleRadians)) return 0;
    auto& experiment = experiments[id];
    experiment.state = {std::clamp(angleRadians, -80.0 * PI / 180.0, 80.0 * PI / 180.0), 0.0};
    experiment.held = true;
    experiment.time = 0.0;
    experiment.measurement = PeriodMeasurement{};
    return 1;
}

int lab_release(int id) {
    if (!validId(id)) return 0;
    experiments[id].held = false;
    return 1;
}

double lab_angle(int id) { return validId(id) ? experiments[id].state.angleRadians : invalid(); }
double lab_velocity(int id) { return validId(id) ? experiments[id].state.angularVelocity : invalid(); }
double lab_time(int id) { return validId(id) ? experiments[id].time : invalid(); }
double lab_prediction(int id) {
    return validId(id) ? CalculatePeriod(experiments[id].length, experiments[id].gravity) : invalid();
}
double lab_period(int id) { return validId(id) ? experiments[id].measurement.mean() : invalid(); }
int lab_count(int id) { return validId(id) ? experiments[id].measurement.count : -1; }
}
