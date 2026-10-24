//
// Created by Sanjay M Santhosh on 24/10/26.
//

#include <cmath>
#include <iostream>

double CalculatePeriod(double lenght, double gravity) {
    constexpr double PI = 3.14159265358979323846;
    return 2.0 * PI *  std::sqrt(lenght/gravity);
}

int main() {

    const double gravity = 9.8;
    const double shortLenght = 1;
    const double longLenght = 2;

    const double shortPeriod = CalculatePeriod(shortLenght, gravity);
    const double longPeriod = CalculatePeriod(longLenght, gravity);

    std::cout << "Short period : " << shortPeriod << std::endl;
    std::cout << "Long period : " << longPeriod << std::endl;
    std::cout << "Ration : "<< longPeriod / shortPeriod << std::endl;

    return 0;
}
