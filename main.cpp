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
        PI * initalAngleDegree / 100,
        0.0
    };


    for (int i = 0; i < 10; i++) {
        double dt = i*0.1;
        PendulumState afterState = calculateState(initialState, gravity, shortLenght, dt);
        std::cout << dt << " | Initial state : " << afterState.angleRadians << " | " << afterState.angularVelocity << std::endl;
    }

    return 0;
}
