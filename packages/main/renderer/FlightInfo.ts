export interface FlightInfoOptions {
    stdoutHeader: string,
}

export class FlightInfo {
    private stdoutHeader: string;

    private static stdoutHeaderRegEx = /^Log (?<logNum>\d) of \d, start (?<start>\d{2}:\d{2}.\d{3}), end (?<end>\d{2}:\d{2}.\d{3}), duration (?<duration>\d{2}:\d{2}.\d{3})$/g;

    constructor({ stdoutHeader } = {} as FlightInfoOptions) {
        this.stdoutHeader = stdoutHeader;
    }

    static isFlightInfoData(stdoutData: string): boolean {
        console.log('stdoutData', stdoutData);
        const matches = stdoutData.matchAll(this.stdoutHeaderRegEx);
        console.log('matches', matches);
        if (matches === null) {
            return false;
        }

        return true;
    }
}
