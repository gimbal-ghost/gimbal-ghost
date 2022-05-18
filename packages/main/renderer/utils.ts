// Convert a number from one scale to another scale
export function scale(
    initialValue: number,
    initialMin: number,
    initialMax: number,
    finalMin: number,
    finalMax: number,
): number {
    const initialRange = initialMax - initialMin;
    const finalRange = finalMax - finalMin;
    const fractionOfInitial = (initialValue - initialMin) / initialRange;
    const finalValue = (fractionOfInitial * finalRange) + finalMin;
    return finalValue;
}

// Force a number to within a range
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(min, value), max);
}

// Find the nearest value in a range of numbers
export function nearest(
    value: number,
    rangeMin: number,
    rangeMax: number,
    increment: number,
): number {
    let nearestValue = 0;
    for (
        let currentRangeValue = rangeMin;
        currentRangeValue <= rangeMax;
        currentRangeValue += increment
    ) {
        const nextRangeValue = (currentRangeValue + increment);
        if (currentRangeValue <= value && value <= nextRangeValue) {
            const differenceFromCurrent = value - currentRangeValue;
            const differenceFromNext = nextRangeValue - value;

            if (differenceFromCurrent <= differenceFromNext) {
                nearestValue = currentRangeValue;
                break;
            }
            else {
                nearestValue = nextRangeValue;
                break;
            }
        }
    }
    return nearestValue;
}
