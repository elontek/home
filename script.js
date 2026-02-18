const deviceList = document.getElementById("deviceList");
const romTable = document.getElementById("romTable");

function renderDevices() {
  deviceList.innerHTML = "";
  Object.keys(romData).forEach((device, index) => {
    const li = document.createElement("li");
    li.textContent = device;
    if (index === 0) li.classList.add("active");
    li.onclick = () => {
      document.querySelectorAll(".sidebar li").forEach(x => x.classList.remove("active"));
      li.classList.add("active");
      renderTable(device);
    };
    deviceList.appendChild(li);
  });
}

function renderTable(device) {
  romTable.innerHTML = "";
  romData[device].forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.rom}</td>
      <td>${r.android}</td>
      <td>${r.date}</td>
      <td>${r.type}</td>
      <td><a class="download" href="${r.url}" target="_blank">${r.rom}</a></td>
    `;
    romTable.appendChild(tr);
  });
}

renderDevices();
renderTable(Object.keys(romData)[0]);
