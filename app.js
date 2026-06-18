// Global variables
let showAllTasksFlag = false;
let isAdminLoggedIn = false;
let deletedTaskCache = null;
let undoTimeoutToken = null;

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser"));
    } catch (e) {
        return null;
    }
}

function initUsers() {
    if (!localStorage.getItem("users")) {
        localStorage.setItem("users", JSON.stringify([
            { username: "admin", password: "admin123", role: "admin", department: "ALL" },
            { username: "hr", password: "123", role: "user", department: "HR" },
            { username: "reception", password: "123", role: "user", department: "Reception" },
            { username: "it", password: "123", role: "user", department: "IT" }
        ]));
    }

    if (!localStorage.getItem("departments")) {
        localStorage.setItem("departments", JSON.stringify(["HR", "Reception", "IT", "ADMIN", "Maintenance"]));
    }
}

function initApp() {
    initUsers();

    let currentUser = getCurrentUser();

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    isAdminLoggedIn = currentUser.role === "admin";

    loadDropdownsAndFilters();
    setDashboardTitle();
    setCurrentDateTime();
    showTasks();
}

function setDashboardTitle() {
    let currentUser = getCurrentUser();
    let title = document.getElementById("dashboardTitle");

    if (!title || !currentUser) return;

    if (currentUser.role === "admin") {
        title.innerHTML = "📋 All Department Tasks";
    } else {
        title.innerHTML = "📋 " + currentUser.department + " Department Tasks";
    }
}

function switchTab(viewId) {
    document.querySelectorAll(".app-view").forEach(view => {
        view.classList.add("d-none");
    });

    let view = document.getElementById(viewId);
    if (view) {
        view.classList.remove("d-none");
    }

    ["tab-dashboard", "tab-addtask", "tab-admin"].forEach(id => {
        let tab = document.getElementById(id);
        if (tab) tab.classList.remove("active");
    });

    if (viewId === "dashboard-view") {
        let tab = document.getElementById("tab-dashboard");
        if (tab) tab.classList.add("active");
        showTasks();
    }

    if (viewId === "addtask-view") {
        let tab = document.getElementById("tab-addtask");
        if (tab) tab.classList.add("active");
        setCurrentDateTime();
    }

    if (viewId === "admin-view") {
        let tab = document.getElementById("tab-admin");
        if (tab) tab.classList.add("active");
    }
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
}

function toggleCompletedTasks() {
    showAllTasksFlag = !showAllTasksFlag;

    let btn = document.getElementById("toggleCompletedBtn");
    if (btn) {
        if (showAllTasksFlag) {
            btn.innerText = "👁️ Show Pending Only";
            btn.classList.remove("btn-outline-primary");
            btn.classList.add("btn-primary");
        } else {
            btn.innerText = "👁️ Show All Tasks";
            btn.classList.remove("btn-primary");
            btn.classList.add("btn-outline-primary");
        }
    }

    showTasks();
}

// Admin access
function triggerAdminLogin() {
    let currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        alert("Only Admin can access this panel!");
        return;
    }

    isAdminLoggedIn = true;

    loadDropdownsAndFilters();
    showAdminDepartments();
    showAdminUsersList();
    renderNotificationLogs();

    switchTab("admin-view");
}

function exitAdminMode() {
    isAdminLoggedIn = false;
    alert("Admin Control Mode Locked.");
    switchTab("dashboard-view");
}

// Dropdowns
function loadDropdownsAndFilters() {
    let departments = JSON.parse(localStorage.getItem("departments")) || ["HR", "Reception", "IT", "ADMIN", "Maintenance"];
    let currentUser = getCurrentUser();

    let filterDept = document.getElementById("filterDepartment");
    if (filterDept) {
        filterDept.innerHTML = `<option value="ALL">All Departments</option>`;
        departments.forEach(d => {
            filterDept.innerHTML += `<option value="${d}">${d}</option>`;
        });

        if (currentUser) {
            if (currentUser.role === "admin") {
                filterDept.value = "ALL";
                filterDept.disabled = false;
            } else {
                filterDept.value = currentUser.department;
                filterDept.disabled = true;
            }
        }
    }

    let deptDdl = document.getElementById("department");
    if (deptDdl) {
        deptDdl.innerHTML = "";
        departments.forEach(d => {
            deptDdl.innerHTML += `<option value="${d}">${d}</option>`;
        });
        if (currentUser) deptDdl.value = currentUser.department;
    }

    let userDdl = document.getElementById("userName");
    if (userDdl) {
        userDdl.innerHTML = "";
        if (currentUser) {
            userDdl.innerHTML = `<option value="${currentUser.username}">${currentUser.username}</option>`;
            userDdl.value = currentUser.username;
        }
    }

    let newDept = document.getElementById("newLoginDepartment");
    if (newDept) {
        newDept.innerHTML = "";
        departments.forEach(d => {
            newDept.innerHTML += `<option value="${d}">${d}</option>`;
        });
    }
}

// Task save
function saveNewTask() {
    let currentUser = getCurrentUser();

    if (!currentUser) {
        alert("Please login again.");
        window.location.href = "login.html";
        return;
    }

    let priority = document.getElementById("priority").value;
    let status = document.getElementById("status").value;
    let taskDate = document.getElementById("taskDate").value;
    let task = document.getElementById("addTxt").value;

    if (task.trim() === "") {
        alert("Please enter task details!");
        return;
    }

    let notes = JSON.parse(localStorage.getItem("notes")) || [];

    notes.push({
        userName: currentUser.username,
        department: currentUser.department,
        priority: priority,
        status: status,
        date: taskDate,
        task: task.trim(),
        completedAt: ""
    });

    localStorage.setItem("notes", JSON.stringify(notes));

    document.getElementById("addTxt").value = "";
    alert("Task Saved Successfully!");
    switchTab("dashboard-view");
}

// Task list
function showTasks() {
    let notesObj = JSON.parse(localStorage.getItem("notes")) || [];
    let users = JSON.parse(localStorage.getItem("users")) || [];
    let currentLoginUser = getCurrentUser();
    let filterDept = document.getElementById("filterDepartment") ? document.getElementById("filterDepartment").value : "ALL";

    let actionHeader = document.getElementById("actionHeader");
    if (actionHeader) {
        actionHeader.style.display = isAdminLoggedIn ? "" : "none";
    }

    let html = "";
    let idCounter = 1;
    let now = new Date();

    notesObj.forEach(function (element, index) {
        if (currentLoginUser && currentLoginUser.role !== "admin" && element.department !== currentLoginUser.department) return;
        if (filterDept !== "ALL" && element.department !== filterDept) return;
        if (!showAllTasksFlag && element.status === "Completed") return;

        let badge = element.priority === "High" ? "🔴 High" : (element.priority === "Medium" ? "🟡 Medium" : "🟢 Low");
        let rowClass = element.status === "Pending" ? "table-danger" : (element.status === "In Progress" ? "table-warning" : "table-success");
        let assignedUser = element.userName || "N/A";

        let overdueBadge = "";
        if (element.date && element.status !== "Completed") {
            let taskDateTime = new Date(element.date);
            if (taskDateTime < now) {
                overdueBadge = `<br><span class="badge badge-overdue">⚠️ OVERDUE</span>`;
            }
        }

        let dateColumnContent = element.date ? element.date.replace("T", " ") : "N/A";
        if (element.status === "Completed" && element.completedAt) {
            dateColumnContent += `<br><small class="text-success font-weight-bold">Done: ${element.completedAt}</small>`;
        } else {
            dateColumnContent += overdueBadge;
        }

        let userCell = assignedUser;
        if (isAdminLoggedIn) {
            let userOptions = "";
            users.forEach(u => {
                userOptions += `<option value="${u.username}" ${assignedUser === u.username ? "selected" : ""}>${u.username}</option>`;
            });

            userCell = `<select class="form-control form-control-sm font-weight-bold" onchange="inlineUpdateUser(${index}, this.value, '${assignedUser}')">${userOptions}</select>`;
        }

        let statusCell = element.status;
        if (isAdminLoggedIn || (currentLoginUser && currentLoginUser.department === element.department)) {
            statusCell = `
                <select class="form-control form-control-sm" onchange="inlineUpdateStatus(${index}, this.value, '${assignedUser}')">
                    <option value="Pending" ${element.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="In Progress" ${element.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Completed" ${element.status === "Completed" ? "selected" : ""}>Completed</option>
                </select>`;
        }

        let actionCellHtml = "";
        if (isAdminLoggedIn) {
            actionCellHtml = `
            <td style="vertical-align: middle; white-space: nowrap;">
                <button class="btn btn-warning btn-sm py-0" onclick="editTaskDescription(${index})">Edit</button>
                <button class="btn btn-danger btn-sm py-0" onclick="deleteTask(${index})">Delete</button>
            </td>`;
        }

        html += `
        <tr class="${rowClass}">
            <td style="vertical-align: middle; font-weight: bold;">${idCounter++}</td>
            <td style="vertical-align: middle;">${userCell}</td>
            <td style="vertical-align: middle;">${element.department}</td>
            <td style="vertical-align: middle;" ondblclick="makeCellEditable(${index}, this)">${element.task}</td>
            <td style="vertical-align: middle;">${badge}</td>
            <td style="vertical-align: middle;">${statusCell}</td>
            <td style="vertical-align: middle; font-size:12px;">${dateColumnContent}</td>
            ${actionCellHtml}
        </tr>`;
    });

    let taskTable = document.getElementById("taskTable");
    if (taskTable) {
        taskTable.innerHTML = html || `<tr><td colspan="${isAdminLoggedIn ? "8" : "7"}" class="text-center text-muted font-italic py-3">No active tasks found.</td></tr>`;
    }

    updateCountersAndProgress(notesObj, filterDept);
}

function makeCellEditable(index, cellElement) {
    if (!isAdminLoggedIn) return;

    let currentText = cellElement.innerText.split("\n")[0].trim();
    cellElement.innerHTML = `<input type="text" class="inline-edit-input" value="${currentText}" onblur="saveInlineText(${index}, this, '${currentText.replace(/'/g, "\\'")}')" onkeypress="checkEnterKey(event, ${index}, this, '${currentText.replace(/'/g, "\\'")}')">`;
    cellElement.querySelector("input").focus();
}

function saveInlineText(index, inputElement, oldText) {
    let newText = inputElement.value.trim();
    if (newText !== "" && newText !== oldText) {
        let notes = JSON.parse(localStorage.getItem("notes")) || [];
        notes[index].task = newText;
        localStorage.setItem("notes", JSON.stringify(notes));

        let activeUser = notes[index].userName || "Unknown Employee";
        logNotification(activeUser, `[Task ID: ${index + 1}] Description: "${oldText}"`, `Description Changed To: "${newText}"`);
    }
    showTasks();
}

function checkEnterKey(event, index, inputElement, oldText) {
    if (event.key === "Enter") saveInlineText(index, inputElement, oldText);
}

function inlineUpdateUser(index, newVal, oldVal) {
    if (!isAdminLoggedIn) {
        alert("Only admin can change user.");
        showTasks();
        return;
    }

    if (newVal === oldVal) return;

    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes[index].userName = newVal;

    let users = JSON.parse(localStorage.getItem("users")) || [];
    let selectedUser = users.find(u => u.username === newVal);
    if (selectedUser && selectedUser.department !== "ALL") {
        notes[index].department = selectedUser.department;
    }

    localStorage.setItem("notes", JSON.stringify(notes));

    logNotification(newVal, `[Task ID: ${index + 1}] Assigned to: "${oldVal}"`, `Owner Transferred To: "${newVal}"`);
    showTasks();
}

function inlineUpdateStatus(index, val, employeeName) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    if (!notes[index]) return;

    let oldStatus = notes[index].status;
    if (oldStatus === val) return;

    notes[index].status = val;

    if (val === "Completed") {
        let currentStamp = new Date();
        notes[index].completedAt = currentStamp.toLocaleDateString() + " " + currentStamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
        notes[index].completedAt = "";
    }

    localStorage.setItem("notes", JSON.stringify(notes));

    logNotification(employeeName, `[Task: "${notes[index].task}"] Status was: "${oldStatus}"`, `Status Updated To: "${val}"`);
    showTasks();
}

function editTaskDescription(index) {
    if (!isAdminLoggedIn) return;

    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    let oldText = notes[index].task;
    let res = prompt("Modify Task Details:", oldText);

    if (res && res.trim() !== "" && res.trim() !== oldText) {
        notes[index].task = res.trim();
        localStorage.setItem("notes", JSON.stringify(notes));

        logNotification(notes[index].userName || "Admin", `[Button Edit] "${oldText}"`, `"${res.trim()}"`);
        showTasks();
    }
}

function logNotification(user, oldData, newData) {
    let logsObj = JSON.parse(localStorage.getItem("system_audit_logs")) || [];
    let now = new Date();
    let timeString = now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    logsObj.unshift({
        user: user,
        old: oldData,
        new: newData,
        time: timeString
    });

    localStorage.setItem("system_audit_logs", JSON.stringify(logsObj));
}

function renderNotificationLogs() {
    let logs = JSON.parse(localStorage.getItem("system_audit_logs")) || [];
    let html = "";

    logs.forEach((log, idx) => {
        html += `
        <tr>
            <td>${idx + 1}</td>
            <td class="text-primary font-weight-bold">👤 ${log.user}</td>
            <td class="text-muted">${log.old}</td>
            <td class="text-success font-weight-bold">${log.new}</td>
            <td><span class="badge badge-secondary">${log.time}</span></td>
        </tr>`;
    });

    let tbody = document.getElementById("notificationTableBody");
    if (tbody) {
        tbody.innerHTML = html || `<tr><td colspan="5" class="text-center text-muted">Logs are clean.</td></tr>`;
    }
}

function clearNotificationLogs() {
    if (confirm("Do you want to permanently wipe out all edit notification history?")) {
        localStorage.removeItem("system_audit_logs");
        renderNotificationLogs();
    }
}

function deleteTask(index) {
    if (!isAdminLoggedIn) return;

    if (confirm("Are you sure you want to delete this task?")) {
        let notes = JSON.parse(localStorage.getItem("notes")) || [];

        deletedTaskCache = {
            index: index,
            taskData: notes[index]
        };

        notes.splice(index, 1);
        localStorage.setItem("notes", JSON.stringify(notes));
        showTasks();

        let toast = document.getElementById("undoToast");
        if (toast) {
            toast.style.display = "block";
            clearTimeout(undoTimeoutToken);
            undoTimeoutToken = setTimeout(() => { toast.style.display = "none"; }, 5000);
        }
    }
}

function undoLastDelete() {
    if (deletedTaskCache) {
        let notes = JSON.parse(localStorage.getItem("notes")) || [];
        notes.splice(deletedTaskCache.index, 0, deletedTaskCache.taskData);
        localStorage.setItem("notes", JSON.stringify(notes));
        deletedTaskCache = null;

        let toast = document.getElementById("undoToast");
        if (toast) toast.style.display = "none";

        showTasks();
        alert("Task Restored Successfully!");
    }
}

function updateCountersAndProgress(notes, filterDept) {
    let currentUser = getCurrentUser();
    let total = 0, pending = 0, progress = 0, completed = 0;

    notes.forEach(t => {
        if (currentUser && currentUser.role !== "admin" && t.department !== currentUser.department) return;

        if (filterDept === "ALL" || t.department === filterDept) {
            total++;
            if (t.status === "Pending") pending++;
            else if (t.status === "In Progress") progress++;
            else if (t.status === "Completed") completed++;
        }
    });

    let totalTasks = document.getElementById("totalTasks");
    let pendingTasks = document.getElementById("pendingTasks");
    let progressTasks = document.getElementById("progressTasks");
    let completedTasks = document.getElementById("completedTasks");

    if (totalTasks) totalTasks.innerText = total;
    if (pendingTasks) pendingTasks.innerText = pending;
    if (progressTasks) progressTasks.innerText = progress;
    if (completedTasks) completedTasks.innerText = completed;

    let percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    let pBar = document.getElementById("liveProgressBar");
    if (pBar) {
        pBar.style.width = percent + "%";
        pBar.innerText = percent + "% Completed";
    }
}

// Department admin
function addDepartment() {
    let dept = document.getElementById("deptName").value.trim();
    if (dept === "") return;

    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    if (departments.includes(dept)) {
        alert("Department already exists.");
        return;
    }

    departments.push(dept);
    localStorage.setItem("departments", JSON.stringify(departments));

    document.getElementById("deptName").value = "";
    showAdminDepartments();
    loadDropdownsAndFilters();
}

function showAdminDepartments() {
    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    let html = "";

    departments.forEach((d, idx) => {
        html += `<tr>
            <td>${idx + 1}</td>
            <td class="font-weight-bold">${d}</td>
            <td class="text-center">
                <button class="btn btn-warning btn-sm py-0" onclick="editAdminDept(${idx})">Edit</button>
                <button class="btn btn-danger btn-sm py-0" onclick="deleteAdminDept(${idx})">Delete</button>
            </td>
        </tr>`;
    });

    let deptTable = document.getElementById("deptTable");
    if (deptTable) deptTable.innerHTML = html;
}

function editAdminDept(idx) {
    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    let oldDept = departments[idx];
    let newDept = prompt("Edit Department Name:", oldDept);

    if (!newDept || newDept.trim() === "") return;

    newDept = newDept.trim();
    departments[idx] = newDept;
    localStorage.setItem("departments", JSON.stringify(departments));

    let users = JSON.parse(localStorage.getItem("users")) || [];
    users.forEach(u => {
        if (u.department === oldDept) u.department = newDept;
    });
    localStorage.setItem("users", JSON.stringify(users));

    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes.forEach(n => {
        if (n.department === oldDept) n.department = newDept;
    });
    localStorage.setItem("notes", JSON.stringify(notes));

    showAdminDepartments();
    showAdminUsersList();
    loadDropdownsAndFilters();
    showTasks();
}

function deleteAdminDept(idx) {
    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    let dept = departments[idx];

    if (!confirm("Delete department: " + dept + "?")) return;

    departments.splice(idx, 1);
    localStorage.setItem("departments", JSON.stringify(departments));

    showAdminDepartments();
    loadDropdownsAndFilters();
}

// Login user admin
function addLoginUser() {
    let username = document.getElementById("newLoginUsername").value.trim();
    let password = document.getElementById("newLoginPassword").value.trim();
    let department = document.getElementById("newLoginDepartment").value;
    let role = document.getElementById("newLoginRole").value;

    if (username === "" || password === "") {
        alert("Username and password required.");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];

    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        alert("This username already exists.");
        return;
    }

    users.push({
        username: username,
        password: password,
        role: role,
        department: role === "admin" ? "ALL" : department
    });

    localStorage.setItem("users", JSON.stringify(users));

    document.getElementById("newLoginUsername").value = "";
    document.getElementById("newLoginPassword").value = "";

    showAdminUsersList();
    loadDropdownsAndFilters();
    alert("Login user created successfully.");
}

function showAdminUsersList() {
    let users = JSON.parse(localStorage.getItem("users")) || [];
    let html = "";

    users.forEach((u, idx) => {
        html += `<tr>
            <td>${idx + 1}</td>
            <td class="font-weight-bold">${u.username}</td>
            <td>${u.department}</td>
            <td><span class="badge ${u.role === "admin" ? "badge-danger" : "badge-primary"}">${u.role}</span></td>
            <td>${u.password}</td>
            <td style="white-space: nowrap;">
                <button class="btn btn-warning btn-sm py-0" onclick="editLoginUser(${idx})">Edit</button>
                <button class="btn btn-info btn-sm py-0" onclick="resetLoginPassword(${idx})">Pass</button>
                <button class="btn btn-danger btn-sm py-0" onclick="deleteLoginUser(${idx})">Delete</button>
            </td>
        </tr>`;
    });

    let table = document.getElementById("adminUserTable");
    if (table) table.innerHTML = html;
}

function editLoginUser(idx) {
    let users = JSON.parse(localStorage.getItem("users")) || [];
    let departments = JSON.parse(localStorage.getItem("departments")) || [];
    let u = users[idx];

    let newUsername = prompt("Edit Username:", u.username);
    if (!newUsername || newUsername.trim() === "") return;

    let newRole = prompt("Role type: admin or user", u.role);
    if (!newRole || !["admin", "user"].includes(newRole.trim().toLowerCase())) {
        alert("Role must be admin or user.");
        return;
    }

    newRole = newRole.trim().toLowerCase();

    let newDepartment = "ALL";
    if (newRole !== "admin") {
        newDepartment = prompt("Department:", u.department);
        if (!newDepartment || newDepartment.trim() === "") return;
        newDepartment = newDepartment.trim();

        if (!departments.includes(newDepartment)) {
            departments.push(newDepartment);
            localStorage.setItem("departments", JSON.stringify(departments));
        }
    }

    let oldUsername = u.username;
    users[idx].username = newUsername.trim();
    users[idx].role = newRole;
    users[idx].department = newDepartment;

    localStorage.setItem("users", JSON.stringify(users));

    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes.forEach(n => {
        if (n.userName === oldUsername) {
            n.userName = users[idx].username;
            n.department = users[idx].department;
        }
    });
    localStorage.setItem("notes", JSON.stringify(notes));

    let currentUser = getCurrentUser();
    if (currentUser && currentUser.username === oldUsername) {
        localStorage.setItem("currentUser", JSON.stringify(users[idx]));
    }

    loadDropdownsAndFilters();
    showAdminUsersList();
    showTasks();
}

function resetLoginPassword(idx) {
    let users = JSON.parse(localStorage.getItem("users")) || [];
    let newPass = prompt("Enter new password for " + users[idx].username + ":", users[idx].password);

    if (!newPass || newPass.trim() === "") return;

    users[idx].password = newPass.trim();
    localStorage.setItem("users", JSON.stringify(users));

    showAdminUsersList();
    alert("Password updated.");
}

function deleteLoginUser(idx) {
    let users = JSON.parse(localStorage.getItem("users")) || [];
    let currentUser = getCurrentUser();

    if (users[idx].username === "admin") {
        alert("Default admin cannot be deleted.");
        return;
    }

    if (currentUser && currentUser.username === users[idx].username) {
        alert("You cannot delete your current logged-in user.");
        return;
    }

    if (!confirm("Delete user: " + users[idx].username + "?")) return;

    users.splice(idx, 1);
    localStorage.setItem("users", JSON.stringify(users));

    showAdminUsersList();
    loadDropdownsAndFilters();
}

function changeAdminPassword() {
    let currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        alert("Only admin can change password.");
        return;
    }

    let newP = document.getElementById("newPass").value.trim();
    if (newP === "") {
        alert("Password cannot be empty!");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];
    let admin = users.find(u => u.username === currentUser.username);
    if (admin) {
        admin.password = newP;
        localStorage.setItem("users", JSON.stringify(users));
        localStorage.setItem("currentUser", JSON.stringify(admin));
    }

    alert("Admin password updated successfully!");
    document.getElementById("newPass").value = "";
    showAdminUsersList();
}

// Backup
function downloadSystemBackup() {
    let backupData = {
        notes: JSON.parse(localStorage.getItem("notes")) || [],
        departments: JSON.parse(localStorage.getItem("departments")) || [],
        users: JSON.parse(localStorage.getItem("users")) || [],
        logs: JSON.parse(localStorage.getItem("system_audit_logs")) || []
    };

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 4));
    let downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TaskTracker_Master_Backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importSystemBackup(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function (e) {
        try {
            let parsedData = JSON.parse(e.target.result);

            if (parsedData.notes) localStorage.setItem("notes", JSON.stringify(parsedData.notes));
            if (parsedData.departments) localStorage.setItem("departments", JSON.stringify(parsedData.departments));
            if (parsedData.users) localStorage.setItem("users", JSON.stringify(parsedData.users));
            if (parsedData.logs) localStorage.setItem("system_audit_logs", JSON.stringify(parsedData.logs));

            alert("Database Restored Successfully!");
            initApp();
            showAdminDepartments();
            showAdminUsersList();
            renderNotificationLogs();
        } catch (err) {
            alert("Error parsing backup!");
        }
    };
    reader.readAsText(file);
}

// Utilities
function setCurrentDateTime() {
    let now = new Date();
    let year = now.getFullYear();
    let month = String(now.getMonth() + 1).padStart(2, "0");
    let day = String(now.getDate()).padStart(2, "0");
    let hours = String(now.getHours()).padStart(2, "0");
    let minutes = String(now.getMinutes()).padStart(2, "0");

    let taskDate = document.getElementById("taskDate");
    if (taskDate) {
        taskDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

function exportToExcel() {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    let currentUser = getCurrentUser();
    let filterDept = document.getElementById("filterDepartment") ? document.getElementById("filterDepartment").value : "ALL";
    let data = [];
    let c = 1;

    notes.forEach(t => {
        if (currentUser && currentUser.role !== "admin" && t.department !== currentUser.department) return;

        if (filterDept === "ALL" || t.department === filterDept) {
            data.push({
                "ID": c++,
                "User Name": t.userName || "N/A",
                "Department": t.department,
                "Task": t.task,
                "Priority": t.priority,
                "Status": t.status,
                "Date": t.date ? t.date.replace("T", " ") : "",
                "Completed At": t.completedAt || ""
            });
        }
    });

    if (data.length === 0) {
        alert("No records found.");
        return;
    }

    let ws = XLSX.utils.json_to_sheet(data);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `Tasks_${filterDept}.xlsx`);
}

document.addEventListener("DOMContentLoaded", function () {
    let searchTxt = document.getElementById("searchTxt");
    if (searchTxt) {
        searchTxt.addEventListener("input", function () {
            let val = this.value.toLowerCase();

            document.querySelectorAll("#taskTable tr").forEach(row => {
                if (row.querySelector("td[colspan]")) return;
                row.style.display = row.innerText.toLowerCase().includes(val) ? "" : "none";
            });
        });
    }
});
