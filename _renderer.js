console.log("Renderer aktif");

document.body.style.border = "5px solid blue";

const boot = document.getElementById("boot_screen");
if (boot) {
  boot.style.border = "5px dotted red";
  boot.innerHTML += "<p style='color: red;'>Renderer bekerja</p>";
}


console.log("Renderer aktif");
document.getElementById("boot_screen").style.border = "2px dashed lime";
