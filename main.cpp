//
// Created by Sanjay M Santhosh on 24/10/26.
//

#include <cmath>
#include <iostream>

double CalculatePeriod(double lenght, double gravity) {
    constexpr double PI = 3.14159265358979323846;
    return 2.0 * PI *  std::sqrt(lenght/gravity);
}

struct PendulumState {
    double angleRadians;
    double angularVelocity;
};

PendulumState calculateState(PendulumState state,double gravity, double length, double dt) {

    double angularAccleration =  -gravity * std::sin(state.angleRadians) / length;
    double angularVelcity = state.angularVelocity + angularAccleration*dt;

    state.angularVelocity = angularVelcity;
    state.angleRadians = state.angleRadians + angularVelcity*dt;


    return state;
}

int main() {

    const double gravity = 9.8;
    const double shortLenght = 1;
    const double longLenght = 2;
    constexpr double PI = 3.14159265358979323846;
    const double initalAngleDegree = 30;

    const double shortPeriod = CalculatePeriod(shortLenght, gravity);
    const double longPeriod = CalculatePeriod(longLenght, gravity);

    std::cout << "Short period : " << shortPeriod << std::endl;
    std::cout << "Long period : " << longPeriod << std::endl;
    std::cout << "Ration : "<< longPeriod / shortPeriod << std::endl;


    // capturing motion
    const PendulumState initialState{
        PI * initalAngleDegree / 180.0,
        0.0
    };

    PendulumState state = initialState;
    const double dt = 0.01;
    const int totalSteps = 1000;

    for (int step = 1; step <= totalSteps; ++step) {
        state = calculateState(state, gravity, shortLenght, dt);
        const double timeSeconds = step * dt;
        std::cout << timeSeconds
                  << " | Angle (rad): " << state.angleRadians
                  << " | Angular velocity (rad/s): " << state.angularVelocity
                  << '\n';
    }

    return 0;
}
