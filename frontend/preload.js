const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
    runCalculation: (inputData) => {
        // Placeholder transformer calculation engine
        return dummyCalculation(inputData);
    }
});

function dummyCalculation(data) {

    return {
        windingSummary: {
            LV1: { turns: 320, conductorArea: 32, currentDensity: 2.5, copperLoss: 180 },
            LV2: { turns: 415, conductorArea: 30, currentDensity: 2.8, copperLoss: 160 },
            HV:  { turns: 900, conductorArea: 25, currentDensity: 3.5, copperLoss: 170 }
        },
        coreDesign: {
            netCoreArea: 0.0128,
            coreDiameter: 0.15,
            windowHeight: 0.24
        },
        performance: {
            coreLoss: 415,
            totalLoadLoss: 500,
            totalLoss: 915,
            impedance: 6.5,
            regulation: 3.8
        }
    };
}