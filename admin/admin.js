console.log("ADMIN JS LOADED WITH FULL USER PANEL RIGHTS");

window.onload = function () {
    showDepartments();
    showAdminUsers();
    loadFormSelects();
    setCurrentDateTime();
    showTasks();
};

// --- FORM DROPDOWNS AUTOMATION ---
function loadFormSelects() {
    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    let systemUsers = JSON.parse(localStorage.getItem("systemUsers")) || ["Ritesh", "CHIRAG", "SANAY SIR"];
    
    let deptDdl = document.getElementById("department");
    if(deptDdl) {
        deptDdl.innerHTML = "";
        departments.forEach(d => deptDdl.innerHTML += `<option value="${d}">${d}</option>`);
    }
    
    let userDdl = document.getElementById("userName");
    if(userDdl) {
        userDdl.innerHTML = "";
        systemUsers.forEach(u => userDdl.innerHTML += `<option value="${u}">${u}</option>`);
    }
}

function setCurrentDateTime() {
    let now = new Date();
    let year = now.getFullYear();
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let day = String(now.getDate()).padStart(2, '0');
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let dtInput = document.getElementById("taskDate");
    if(dtInput) dtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// --- DEPARTMENT MANAGEMENT ---
function addDepartment() {
    let dept = document.getElementById("deptName").value.trim();
    if (dept == "") { alert("Enter Department"); return; }
    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    departments.push(dept);
    localStorage.setItem("departments", JSON.stringify(departments));
    document.getElementById("deptName").value = "";
    showDepartments();
    loadFormSelects();
}

function showDepartments() {
    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    let html = "";
    departments.forEach(function(dept, index){
        html += `<tr><td>${index+1}</td><td>${dept}</td><td>
            <button class="btn btn-warning btn-sm py-0" onclick="editDepartment(${index})">Edit</button>
            <button class="btn btn-danger btn-sm py-0" onclick="deleteDepartment(${index})">Delete</button>
        </td></tr>`;
    });
    document.getElementById("deptTable").innerHTML = html;
}

function editDepartment(index){
    let departments = JSON.parse(localStorage.getItem("departments"));
    let newDept = prompt("Enter New Department Name", departments[index]);
    if(newDept && newDept.trim() != ""){
        departments[index] = newDept.trim();
        localStorage.setItem("departments", JSON.stringify(departments));
        showDepartments();
        loadFormSelects();
    }
}

function deleteDepartment(index){
    let departments = JSON.parse(localStorage.getItem("departments"));
    departments.splice(index, 1);
    localStorage.setItem("departments", JSON.stringify(departments));
    showDepartments();
    loadFormSelects();
}

// --- USER MANAGEMENT ---
function addAdminUser() {
    let uName = document.getElementById("newAdminUserName").value.trim();
    if (uName == "") { alert("Enter User Name"); return; }
    let systemUsers = JSON.parse(localStorage.getItem("systemUsers")) || ["Ritesh", "CHIRAG", "SANAY SIR"];
    systemUsers.push(uName);
    localStorage.setItem("systemUsers", JSON.stringify(systemUsers));
    document.getElementById("newAdminUserName").value = "";
    showAdminUsers();
    loadFormSelects();
}

function showAdminUsers() {
    let systemUsers = JSON.parse(localStorage.getItem("systemUsers")) || ["Ritesh", "CHIRAG", "SANAY SIR"];
    let html = "";
    systemUsers.forEach(function(user, index){
        html += `<tr><td>${index + 1}</td><td><b>${user}</b></td><td>
            <button class="btn btn-danger btn-sm py-0" onclick="deleteAdminUser(${index})">Delete</button>
        </td></tr>`;
    });
    document.getElementById("adminUserTable").innerHTML = html;
}

function deleteAdminUser(index) {
    let systemUsers = JSON.parse(localStorage.getItem("systemUsers")) || ["Ritesh", "CHIRAG", "SANAY SIR"];
    if(confirm("Are you sure you want to delete this user?")) {
        systemUsers.splice(index, 1);
        localStorage.setItem("systemUsers", JSON.stringify(systemUsers));
        showAdminUsers();
        loadFormSelects();
    }
}

// --- FULL RIGHTS: ADMIN ADD TASK CONTROLLER ---
let adminAddBtn = document.getElementById('adminAddBtn');
if(adminAddBtn) {
    adminAddBtn.addEventListener('click', function () {
        let userName = document.getElementById('userName').value;
        let department = document.getElementById('department').value;
        let priority = document.getElementById('priority').value;
        let status = document.getElementById('status').value;
        let taskDate = document.getElementById('taskDate').value;
        let task = document.getElementById('addTxt').value;

        if (task.trim() == "") { alert("Please Enter Task"); return; }

        let notes = localStorage.getItem('notes');
        let notesObj = (notes == null) ? [] : JSON.parse(notes);
            
        let taskObj = {
            userName: userName,
            department: department,
            priority: priority,
            status: status,
            date: taskDate,
            task: task
        };

        notesObj.push(taskObj);
        localStorage.setItem('notes', JSON.stringify(notesObj));
        document.getElementById('addTxt').value = '';
        showTasks();
    });
}

// --- FULL RIGHTS: LIVE REFRESH & DROP DOWNS INSIDE ADMIN TABLE ---
function showTasks() {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    let systemUsers = JSON.parse(localStorage.getItem("systemUsers")) || ["Ritesh", "CHIRAG", "SANAY SIR"];
    let html = "";

    notes.forEach(function(task, index){
        let badge = "";
        if (task.priority == "High") badge = "🔴 High";
        else if (task.priority == "Medium") badge = "🟡 Medium";
        else badge = "🟢 Low";

        let rowClass = "";
        if (task.status == "Pending") rowClass = "table-danger";
        else if (task.status == "In Progress") rowClass = "table-warning";
        else if (task.status == "Completed") rowClass = "table-success";

        let currentUser = task.userName || (systemUsers[0] || "Ritesh");

        // Dynamic Name Dropdown Inside Admin Table
        let userOptions = "";
        systemUsers.forEach(function(u) {
            userOptions += `<option value="${u}" ${assignedUser == u ? "selected" : ""}>${u}</option>`;
        });

        html += `
        <tr class="${rowClass}">
            <td style="vertical-align: middle;">${index + 1}</td>
            <td style="vertical-align: middle;">
                <select class="form-control" style="font-size: 13px; padding: 2px 5px; height: 30px; font-weight: bold;" onchange="updateAdminUserLink(${index}, this.value)">
                    ${userOptions}
                </select>
            </td>
            <td style="vertical-align: middle;">${task.department || 'N/A'}</td>
            <td style="vertical-align: middle;">${task.task}</td>
            <td style="vertical-align: middle;">${badge}</td>
            <td style="vertical-align: middle;">
                <select class="form-control" style="font-size: 13px; padding: 2px 5px; height: 30px;" onchange="updateAdminStatusLink(${index}, this.value)">
                    <option value="Pending" ${task.status=="Pending"?"selected":""}>Pending</option>
                    <option value="In Progress" ${task.status=="In Progress"?"selected":""}>In Progress</option>
                    <option value="Completed" ${task.status=="Completed"?"selected":""}>Completed</option>
                </select>
            </td>
            <td style="vertical-align: middle;">${task.date || 'N/A'}</td>
            <td style="vertical-align: middle; white-space: nowrap;">
                <button class="btn btn-warning btn-sm" onclick="editAdminTask(${index})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteAdminTask(${index})">Delete</button>
            </td>
        </tr>`;
    });

    let adminTaskTable = document.getElementById("adminTaskTable");
    if(adminTaskTable) { adminTaskTable.innerHTML = html; }
    updateAdminDashboard();
}

// Live Modifiers for Admin Table Row Dropdowns
function updateAdminUserLink(index, newName) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes[index].userName = newName;
    localStorage.setItem("notes", JSON.stringify(notes));
    showTasks();
}

function updateAdminStatusLink(index, newStatus) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes[index].status = newStatus;
    localStorage.setItem("notes", JSON.stringify(notes));
    showTasks();
}

function editAdminTask(index) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    let newTask = prompt("Edit Task Description", notes[index].task);
    if(newTask == null || newTask.trim() == "") return;
    notes[index].task = newTask;
    localStorage.setItem("notes", JSON.stringify(notes));
    showTasks();
}

function deleteAdminTask(index) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    if(confirm("Are you sure you want to delete this task?")) {
        notes.splice(index, 1);
        localStorage.setItem("notes", JSON.stringify(notes));
        showTasks();
    }
}

function updateAdminDashboard() {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    let total = notes.length, pending = 0, progress = 0, completed = 0;

    notes.forEach(function(task){
        if(task.status === "Pending") pending++;
        else if(task.status === "In Progress") progress++;
        else if(task.status === "Completed") completed++;
    });

    if(document.getElementById("totalTasks")){
        document.getElementById("totalTasks").innerText = total;
        document.getElementById("pendingTasks").innerText = pending;
        document.getElementById("progressTasks").innerText = progress;
        document.getElementById("completedTasks").innerText = completed;
    }
}


// --- 🔐 SIMPLE CHANGE ADMIN PASSWORD FUNCTION ---
function changeAdminPassword() {
    let newInput = document.getElementById("newPass").value.trim();

    // चेक करें कि इनपुट खाली तो नहीं है
    if (newInput === "") {
        alert("Please enter a new password!");
        return;
    }

    if (newInput.length < 4) {
        alert("Password must be at least 4 characters long!");
        return;
    }

    // सीधे नया पासवर्ड लोकल स्टोरेज में ओवरराइट (Save) कर दें
    localStorage.setItem("admin_secret_password", newInput);
    
    alert("Password updated successfully! Use this new password next time.");
    
    // इनपुट बॉक्स को खाली करें
    document.getElementById("newPass").value = "";
}

// Storage Listener to keep data synchronized
window.addEventListener('storage', function () {
    showDepartments();
    showAdminUsers();
    loadFormSelects();
    showTasks();
});
// जैसे ही एडमिन इस टैब को बंद करेगा, उसका पासवर्ड का एक्सेस हट जाएगा
window.onbeforeunload = function() {
    localStorage.removeItem("admin_authenticated");
};