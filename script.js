const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const centerSpinBtn = document.getElementById('centerSpinBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn'); // Nút mới
const namesInput = document.getElementById('namesInput');
const modal = document.getElementById('resultModal');
const winnerText = document.getElementById('winnerText');

// Bảng màu Flat UI
const colors = [
    '#e74c3c', '#8e44ad', '#3498db', '#1abc9c', '#f1c40f', '#e67e22', '#2ecc71', '#d35400'
];

let names = [];
let currentRotation = 0; 
let isSpinning = false;

// --- BIẾN ĐIỀU KHIỂN KỊCH BẢN (RIGGED) ---
let spinCount = 0;      // Đếm số lần đã quay
let sessionMode = 1;    // 1: Kịch bản đầu (Sử -> Lí), 2: Kịch bản sau (Song ngữ -> Sinh)
// Lưu danh sách gốc và các tên đã bị xóa để có thể khôi phục khi reset
let originalNames = [];
let removedNames = [];

// Chuẩn hóa tên: bỏ dấu, viết thường, trim để so khớp linh hoạt
function normalizeName(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function updateNames() {
    names = namesInput.value.split('\n').filter(n => n.trim() !== '');
    // Lưu danh sách gốc lần đầu để có thể khôi phục sau này
    if (originalNames.length === 0) originalNames = names.slice();
    drawWheel();
}

function drawWheel() {
    if (names.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    const arcSize = (2 * Math.PI) / names.length;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    names.forEach((name, index) => {
        const angle = index * arcSize;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        // Viền trắng
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff"; 
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Segoe UI"; 
        ctx.shadowColor = "rgba(0,0,0,0.5)"; 
        ctx.shadowBlur = 4;
        ctx.fillText(name, radius - 30, 8); 
        ctx.restore();
    });
}

function spin() {
    if (isSpinning || names.length === 0) {
        alert("Hãy nhập tên vào danh sách!");
        return;
    }
    isSpinning = true;
    
    // Disable nút
    spinBtn.disabled = true;
    centerSpinBtn.disabled = true;
    resetSessionBtn.disabled = true;
    spinBtn.innerText = "Đang quay...";
    centerSpinBtn.innerText = "...";

    // --- THUẬT TOÁN CHỈNH KẾT QUẢ ---
    let targetName = null;

    // Kịch bản 1: Lần đầu -> 12 Sử, Lần 2 -> 12 Lí
    if (sessionMode === 1) {
        if (spinCount === 0) targetName = "12 Sử";
        else if (spinCount === 1) targetName = "12 Lí";
        // Yêu cầu: lần quay thứ 3 (spinCount === 2) -> "11 Địa" nếu có
        else if (spinCount === 2) targetName = "11 Địa"; // nếu danh sách có
        // Yêu cầu: lần quay thứ 4 (spinCount === 3) -> "12 Tự nhiên 2" nếu có
        else if (spinCount === 3) targetName = "12 Tự nhiên 2"; // nếu danh sách có
    }
    // Kịch bản 2: Lần 1 -> 12 Song ngữ, Lần 2 -> 12 Sinh, Lần 3 -> Random, Lần 4 -> 12 Địa
    else if (sessionMode === 2) {
        if (spinCount === 0) targetName = "12 Song ngữ";
        else if (spinCount === 1) targetName = "12 Sinh";
        else if (spinCount === 2) targetName = null; // Random theo yêu cầu
        else if (spinCount === 3) targetName = "12 Địa"; // nếu danh sách có
    }
    // Kịch bản 3: Lần 1 -> Random, Lần 2 -> 11 Sử
    else if (sessionMode === 3) {
        if (spinCount === 0) targetName = null; // Random
        else if (spinCount === 1) targetName = "11 Sử"; // nếu danh sách có
    }

    // Tìm vị trí của kết quả mong muốn
    let winningIndex = -1;
    if (targetName) {
        // Tìm xem tên đó có trong danh sách hiện tại không (không phân biệt hoa thường)
        const normTarget = normalizeName(targetName);
        winningIndex = names.findIndex(n => normalizeName(n) === normTarget);
    }

    // Nếu không tìm thấy tên mong muốn (hoặc đã quay quá 2 lần), thì quay Random
    if (winningIndex === -1) {
        winningIndex = Math.floor(Math.random() * names.length);
        console.log("Random mode (Target not found or sequence finished)");
    } else {
        console.log(`Rigged mode: Targeting ${targetName} at index ${winningIndex}`);
    }

    // Tăng biến đếm lần quay
    spinCount++;

    // --- TÍNH TOÁN GÓC QUAY ---
    const sliceDeg = 360 / names.length;
    // Quay ít nhất 5 vòng
    const extraSpins = 5 * 360; 
    
    // Tính góc tới tâm lát cắt của ô đích (degrees)
    const sliceCenter = (winningIndex * sliceDeg) + (sliceDeg / 2);
    // Muốn đưa sliceCenter về vị trí pointer (0deg) → cần quay sao cho (sliceCenter + finalRotation) % 360 === 0
    // Tức finalRotation ≡ (360 - sliceCenter) (mod 360).
    const desiredFinalRotationMod = (360 - sliceCenter) % 360;
    // Hiện tại wheel đã quay currentRotation (cộng dồn), tính phần còn thiếu (0..360)
    const currentMod = ((currentRotation % 360) + 360) % 360;
    let delta = (desiredFinalRotationMod - currentMod + 360) % 360;
    // Jitter nhỏ ± (sliceDeg * 0.15)
    const jitter = (Math.random() - 0.5) * (sliceDeg * 0.3);
    delta = (delta + jitter + 360) % 360;
    // Thêm extraSpins để quay đẹp (ít nhất 5 vòng) và cộng delta tương ứng
    const targetRotation = extraSpins + delta;
    
    currentRotation += targetRotation;
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        
        // Enable lại nút
        spinBtn.disabled = false;
        centerSpinBtn.disabled = false;
        resetSessionBtn.disabled = false;
        spinBtn.innerText = "QUAY NGAY";
        centerSpinBtn.innerText = "QUAY";
        
        showWinner(names[winningIndex]);
    }, 5000); 
}

function showWinner(name) {
    winnerText.innerText = name;
    modal.style.display = 'flex';
    confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: colors,
        disableForReducedMotion: true
    });
}

// Xử lý nút Reset Session (Reset kịch bản)
resetSessionBtn.addEventListener('click', () => {
    if(isSpinning) return;
    // Mỗi lần reset sẽ chuyển vòng kịch bản: 1 -> 2 -> 3 -> 1 ...
    sessionMode = (sessionMode % 3) + 1;
    spinCount = 0;   // Reset bộ đếm về 0
    // Khôi phục các phần tử đã xóa (nếu có) bằng cách lấy lại danh sách gốc
    if (originalNames.length > 0) {
        names = originalNames.slice();
        namesInput.value = names.join('\n');
        drawWheel();
        removedNames = [];
    }
    let msg = "";
    if (sessionMode === 1) {
        msg = "Kịch bản 1: Lần 1: 12 Sử, Lần 2: 12 Lí, Lần 3: 11 Địa, Lần 4: 12 Tự nhiên 2 (nếu có).";
    } else if (sessionMode === 2) {
        msg = "Kịch bản 2: Lần 1: 12 Song ngữ, Lần 2: 12 Sinh, Lần 3: Random, Lần 4: 12 Địa (nếu có).";
    } else {
        msg = "Kịch bản 3: Lần 1: Random, Lần 2: 11 Sử (nếu có).";
    }
    alert("Đã Reset!\nDanh sách đã khôi phục.\n" + msg);
});

shuffleBtn.addEventListener('click', () => {
    if(isSpinning) return;
    for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
    }
    namesInput.value = names.join('\n');
    drawWheel();
});

function closeModal() {
    modal.style.display = 'none';
}

function removeWinner() {
    const winnerName = winnerText.innerText;
    const index = names.indexOf(winnerName);
    if (index > -1) {
        // Lưu tên đã xóa vào removedNames để có thể khôi phục khi reset
        removedNames.push(names[index]);
        names.splice(index, 1);
        namesInput.value = names.join('\n');
        drawWheel();
    }
    closeModal();
}

// Event Listeners
namesInput.addEventListener('input', updateNames);
spinBtn.addEventListener('click', spin);
centerSpinBtn.addEventListener('click', spin);

// Vẽ lần đầu
updateNames(); 
