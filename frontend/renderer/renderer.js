document.getElementById("runBtn").addEventListener("click", () => {

    const inputData = {
        ratedPower: document.getElementById("ratedPower").value,
        phases: document.getElementById("phases").value
    };

    const result = window.api.runCalculation(inputData);

    populateOutput(result);

    document.getElementById("outputSection").classList.remove("hidden");
});

function populateOutput(data) {

    const winding = data.windingSummary;

    document.getElementById("windingOutput").innerHTML = `
        <tr>
            <th></th><th>LV1</th><th>LV2</th><th>HV</th>
        </tr>
        <tr>
            <td>Turns</td>
            <td>${winding.LV1.turns}</td>
            <td>${winding.LV2.turns}</td>
            <td>${winding.HV.turns}</td>
        </tr>
        <tr>
            <td>Conductor Area</td>
            <td>${winding.LV1.conductorArea}</td>
            <td>${winding.LV2.conductorArea}</td>
            <td>${winding.HV.conductorArea}</td>
        </tr>
        <tr>
            <td>Current Density</td>
            <td>${winding.LV1.currentDensity}</td>
            <td>${winding.LV2.currentDensity}</td>
            <td>${winding.HV.currentDensity}</td>
        </tr>
        <tr>
            <td>Copper Loss</td>
            <td>${winding.LV1.copperLoss}</td>
            <td>${winding.LV2.copperLoss}</td>
            <td>${winding.HV.copperLoss}</td>
        </tr>
    `;

    document.getElementById("coreOutput").innerHTML = `
        Net Core Area: ${data.coreDesign.netCoreArea} m²<br>
        Core Diameter: ${data.coreDesign.coreDiameter} m<br>
        Window Height: ${data.coreDesign.windowHeight} m
    `;

    document.getElementById("performanceOutput").innerHTML = `
        Core Loss: ${data.performance.coreLoss} W<br>
        Total Load Loss: ${data.performance.totalLoadLoss} W<br>
        Total Loss: ${data.performance.totalLoss} W<br>
        Impedance: ${data.performance.impedance} %<br>
        Regulation: ${data.performance.regulation} %
    `;
}