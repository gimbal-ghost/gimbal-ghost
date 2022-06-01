import { BlackboxFlightEvent } from '../../main/renderer/BlackboxFlight';

export interface BlackboxInfo {
    logPath: string,
    flightEvents: Map<number, BlackboxFlightEvent>,
}

export interface ApplicationState {
    blackboxFiles: Array<BlackboxInfo>,
    message: string | null,
    version: string | null,
    isRendering: boolean,
    dragPresent: boolean,
}
