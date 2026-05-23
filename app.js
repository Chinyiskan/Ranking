/**
 * ==========================================================================
 * RankFlow - Core Application Logic (Vanilla JS)
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- APPLICATION STATE ---
  let state = {
    leaderboards: {},
    activeBoardId: ""
  };

  // --- CONFIG & CONSTANTS ---
  const STORAGE_KEY = "rankflow_state";
  
  // Custom premium gradient presets for initial-based avatars (no emojis, professional)
  const AVATAR_GRADIENTS = [
    "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)", // Indigo to Cyan
    "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", // Violet to Pink
    "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)", // Cyan to Emerald
    "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)", // Orange to Amber
    "linear-gradient(135deg, #f43f5e 0%, #ef4444 100%)", // Rose to Red
    "linear-gradient(135deg, #64748b 0%, #3b82f6 100%)"  // Slate to Blue
  ];

  // --- BOOTSTRAP INSTANCES ---
  const createModalEl = document.getElementById("createBoardModal");
  const createModal = new bootstrap.Modal(createModalEl);
  
  const deleteModalEl = document.getElementById("deleteConfirmModal");
  const deleteModal = new bootstrap.Modal(deleteModalEl);
  
  const toastEl = document.getElementById("liveToast");
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });

  // --- ELEMENT SELECTORS ---
  // Layout views
  const noBoardsFallback = document.getElementById("no-boards-fallback");
  const activeBoardInterface = document.getElementById("active-board-interface");
  
  // Sidebar elements (Desktop)
  const boardSelectorContainer = document.getElementById("leaderboard-selector-container");
  const inputBoardName = document.getElementById("input-board-name");
  const inputPlusStep = document.getElementById("input-plus-step");
  const inputMinusStep = document.getElementById("input-minus-step");
  const btnCreateBoardTrigger = document.getElementById("btn-create-board-trigger");
  const btnExportBoard = document.getElementById("btn-export-board");
  const btnImportBoard = document.getElementById("btn-import-board");
  const fileImportInput = document.getElementById("file-import-input");
  const btnDeleteBoard = document.getElementById("btn-delete-board");
  
  // Sidebar elements (Mobile Offcanvas)
  const mobileBoardSelectorContainer = document.getElementById("mobile-leaderboard-selector-container");
  const mobileInputBoardName = document.getElementById("mobile-input-board-name");
  const mobileInputPlusStep = document.getElementById("mobile-input-plus-step");
  const mobileInputMinusStep = document.getElementById("mobile-input-minus-step");
  const btnMobileCreateBoardTrigger = document.getElementById("btn-mobile-create-board-trigger");
  const btnMobileExportBoard = document.getElementById("btn-mobile-export-board");
  const btnMobileImportBoard = document.getElementById("btn-mobile-import-board");
  const btnMobileDeleteBoard = document.getElementById("btn-mobile-delete-board");

  // Dashboard / Active board header & Stats
  const lblBoardTitle = document.getElementById("lbl-board-title");
  const statCount = document.getElementById("stat-count");
  const statPoints = document.getElementById("stat-points");

  // Search Filter
  const inputSearchFilter = document.getElementById("input-search-filter");
  const btnClearSearch = document.getElementById("btn-clear-search");

  // Participant Form
  const formAddParticipant = document.getElementById("form-add-participant");
  const inputNewName = document.getElementById("input-new-name");
  const inputNewScore = document.getElementById("input-new-score");

  // Dynamic board list container
  const rankingsList = document.getElementById("rankings-list");

  // Modals Forms & Confirmations
  const formCreateBoard = document.getElementById("form-create-board");
  const newBoardName = document.getElementById("new-board-name");
  const newPlusStep = document.getElementById("new-plus-step");
  const newMinusStep = document.getElementById("new-minus-step");
  
  const lblDeleteBoardTarget = document.getElementById("lbl-delete-board-target");
  const btnConfirmDeleteBoard = document.getElementById("btn-confirm-delete-board");
  const btnCreateBoardFallback = document.getElementById("btn-create-board-fallback");

  // --- HELPER FUNCTIONS ---

  // Generate notification toast
  function showToast(message, isError = false) {
    const toastMessage = document.getElementById("toast-message");
    const toastIcon = document.getElementById("toast-icon");
    
    toastMessage.textContent = message;
    if (isError) {
      toastEl.classList.remove("border-neon");
      toastEl.classList.add("border-danger");
      toastIcon.className = "bi bi-exclamation-triangle-fill text-danger";
    } else {
      toastEl.classList.remove("border-danger");
      toastEl.classList.add("border-neon");
      toastIcon.className = "bi bi-check-circle-fill text-cyan";
    }
    toast.show();
  }

  // Get dynamic letters initials from full name
  function getInitials(name) {
    if (!name) return "";
    const cleanName = name.trim().replace(/\s+/g, " ");
    const parts = cleanName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  // Generate deterministic gradient based on participant name
  function getAvatarGradient(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[index];
  }

  // Generate unique IDs
  function generateUUID() {
    return "board_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  }

  // --- STATE MUTATION & LOCALSTORAGE SYNC ---

  // Load state from LocalStorage
  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        state = JSON.parse(stored);
      } else {
        // Create default template board if empty (no emojis!)
        createTemplateState();
      }
    } catch (e) {
      console.error("Error al cargar localStorage, creando datos de plantilla", e);
      createTemplateState();
    }
  }

  // Save active state to LocalStorage
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Show dynamic saving pulse indicator
      const saveStatus = document.getElementById("save-status");
      saveStatus.textContent = "Guardado local";
      saveStatus.classList.remove("text-danger", "text-muted");
      saveStatus.classList.add("text-secondary");
    } catch (e) {
      console.error("Error al guardar en localStorage", e);
      const saveStatus = document.getElementById("save-status");
      saveStatus.textContent = "Error al auto-guardar!";
      saveStatus.classList.remove("text-muted");
      saveStatus.classList.add("text-danger");
    }
  }

  // Create clean initial template board (starts empty as requested)
  function createTemplateState() {
    state.leaderboards = {};
    state.activeBoardId = "";
    saveState();
  }

  // --- INTERFACE SYNCHRONIZATION ---

  // Sync inputs values between desktop sidebar and mobile offcanvas
  function syncSettingsInputs() {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    // Sync title/name inputs
    inputBoardName.value = activeBoard.name;
    mobileInputBoardName.value = activeBoard.name;

    // Sync scoring modifiers
    inputPlusStep.value = activeBoard.plusStep;
    mobileInputPlusStep.value = activeBoard.plusStep;
    
    inputMinusStep.value = activeBoard.minusStep;
    mobileInputMinusStep.value = activeBoard.minusStep;

    // Sync radio check values for sorting
    const isDesc = activeBoard.sortOrder === "desc";
    
    document.getElementById("sort-desc").checked = isDesc;
    document.getElementById("sort-asc").checked = !isDesc;
    
    document.getElementById("mobile-sort-desc").checked = isDesc;
    document.getElementById("mobile-sort-asc").checked = !isDesc;
  }

  // --- RENDER FUNCTIONS ---

  // Render list of boards in sidebar selectors
  function renderBoardsSelectors() {
    const boardIds = Object.keys(state.leaderboards);
    
    // Clear lists
    boardSelectorContainer.innerHTML = "";
    mobileBoardSelectorContainer.innerHTML = "";

    if (boardIds.length === 0) return;

    boardIds.forEach(id => {
      const board = state.leaderboards[id];
      const isActive = id === state.activeBoardId;

      // Create item pill
      const buildPill = () => {
        const pill = document.createElement("div");
        pill.className = `board-item-pill ${isActive ? "active" : ""}`;
        pill.dataset.id = id;

        const text = document.createElement("span");
        text.className = "board-item-text";
        text.textContent = board.name;

        const icon = document.createElement("i");
        icon.className = `bi ${isActive ? "bi-check-circle-fill text-cyan" : "bi-hash text-muted"}`;

        pill.appendChild(icon);
        pill.appendChild(text);

        pill.addEventListener("click", () => {
          selectLeaderboard(id);
          // Close mobile offcanvas if open
          const offcanvasEl = document.getElementById("sidebarOffcanvas");
          const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasEl);
          if (offcanvasInstance) offcanvasInstance.hide();
        });

        return pill;
      };

      boardSelectorContainer.appendChild(buildPill());
      mobileBoardSelectorContainer.appendChild(buildPill());
    });
  }

  // Render whole dashboard
  function renderDashboard() {
    const activeBoard = state.leaderboards[state.activeBoardId];

    if (!activeBoard) {
      // Show fallback empty state
      noBoardsFallback.classList.remove("d-none");
      activeBoardInterface.classList.add("d-none");
      
      // Disable settings controls
      toggleSettingsDisable(true);
      return;
    }

    noBoardsFallback.classList.add("d-none");
    activeBoardInterface.classList.remove("d-none");
    toggleSettingsDisable(false);

    // Update headings and configurations settings inputs
    lblBoardTitle.textContent = activeBoard.name;
    syncSettingsInputs();

    // Render Stats
    const totalCount = activeBoard.participants.length;
    const totalPoints = activeBoard.participants.reduce((acc, p) => acc + p.score, 0);

    statCount.textContent = totalCount;
    statPoints.textContent = totalPoints;

    // Render Participants List
    renderParticipants();
  }

  // Enable/Disable side settings if there is no active board
  function toggleSettingsDisable(disabled) {
    const inputs = [
      inputBoardName, inputPlusStep, inputMinusStep,
      mobileInputBoardName, mobileInputPlusStep, mobileInputMinusStep,
      btnDeleteBoard, btnMobileDeleteBoard,
      btnExportBoard, btnMobileExportBoard
    ];
    inputs.forEach(el => {
      if (el) el.disabled = disabled;
    });

    const radioChecks = ["sort-desc", "sort-asc", "mobile-sort-desc", "mobile-sort-asc"];
    radioChecks.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
  }

  // Render and sort participants cards
  function renderParticipants() {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const query = inputSearchFilter.value.toLowerCase().trim();

    // Sort participants list
    let sortedList = [...activeBoard.participants];
    
    // Sort logic based on setting direction
    const isDesc = activeBoard.sortOrder === "desc";
    sortedList.sort((a, b) => {
      if (a.score === b.score) {
        // Alphabetical second tier sort if scores match
        return a.name.localeCompare(b.name);
      }
      return isDesc ? b.score - a.score : a.score - b.score;
    });

    // Save rankings positioning in state cache for badges comparison
    const originalRankMap = new Map();
    sortedList.forEach((p, index) => {
      originalRankMap.set(p.id, index + 1);
    });

    // Apply search filter if query exists
    if (query) {
      sortedList = sortedList.filter(p => p.name.toLowerCase().includes(query));
      btnClearSearch.classList.remove("d-none");
    } else {
      btnClearSearch.classList.add("d-none");
    }

    // Clear list
    rankingsList.innerHTML = "";

    if (sortedList.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "text-center py-5 text-muted glass-panel rounded-card border-neon-muted mt-3";
      emptyDiv.innerHTML = `
        <i class="bi bi-people fs-1 text-muted d-block mb-2"></i>
        <span>${query ? "Ningún participante coincide con la búsqueda" : "La tabla de posiciones está vacía. Añade un participante arriba!"}</span>
      `;
      rankingsList.appendChild(emptyDiv);
      return;
    }

    // Render cards list with nice custom animations
    sortedList.forEach((p) => {
      const finalRank = originalRankMap.get(p.id);
      
      // Determine rank styling
      let rankClass = "rank-normal";
      let rankText = finalRank;
      if (finalRank === 1) {
        rankClass = "rank-1";
      } else if (finalRank === 2) {
        rankClass = "rank-2";
      } else if (finalRank === 3) {
        rankClass = "rank-3";
      }

      const card = document.createElement("div");
      card.className = "participant-card card-scale-in";
      card.id = `participant-card-${p.id}`;

      // Rank Column
      const rankWrap = document.createElement("div");
      rankWrap.className = "header-col rank d-flex justify-content-center align-items-center";
      const rankBadge = document.createElement("div");
      rankBadge.className = `rank-badge-wrap ${rankClass}`;
      rankBadge.textContent = rankText;
      rankWrap.appendChild(rankBadge);
      card.appendChild(rankWrap);

      // Avatar Initial Column
      const avatarDiv = document.createElement("div");
      avatarDiv.className = "avatar-initials";
      avatarDiv.style.background = getAvatarGradient(p.name);
      avatarDiv.textContent = getInitials(p.name);
      card.appendChild(avatarDiv);

      // Name details Column
      const nameContainer = document.createElement("div");
      nameContainer.className = "participant-name-container d-flex align-items-center gap-1";
      
      const nameEl = document.createElement("div");
      nameEl.className = "participant-name";
      nameEl.textContent = p.name;

      // Edit name button (visible on card hover)
      const editNameBtn = document.createElement("button");
      editNameBtn.className = "btn-edit-name";
      editNameBtn.title = "Editar nombre";
      editNameBtn.innerHTML = "<i class='bi bi-pencil'></i>";
      editNameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        enterNameDirectEdit(p.id, nameContainer, nameEl, editNameBtn, avatarDiv);
      });
      
      nameContainer.appendChild(nameEl);
      nameContainer.appendChild(editNameBtn);
      card.appendChild(nameContainer);

      // Direct point adjustment & Score Columns
      const scoreWrap = document.createElement("div");
      scoreWrap.className = "participant-score-wrap";

      // Decrement minus round button
      const minusBtn = document.createElement("button");
      minusBtn.className = "btn-point-adjust minus";
      minusBtn.title = `Restar ${activeBoard.minusStep} puntos`;
      minusBtn.innerHTML = "<i class='bi bi-dash'></i>";
      minusBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        adjustScore(p.id, -activeBoard.minusStep);
      });

      // Score displays wrapper
      const scoreDisplayWrapper = document.createElement("div");
      scoreDisplayWrapper.className = "score-display-wrapper";

      const scoreNum = document.createElement("span");
      scoreNum.className = "score-num";
      scoreNum.textContent = p.score;
      
      // Make score double-clickable for custom input!
      scoreNum.title = "Doble click para editar puntaje directamente";
      scoreNum.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        enterScoreDirectEdit(p.id, scoreDisplayWrapper, scoreNum);
      });

      scoreDisplayWrapper.appendChild(scoreNum);

      // Increment plus round button
      const plusBtn = document.createElement("button");
      plusBtn.className = "btn-point-adjust plus";
      plusBtn.title = `Sumar ${activeBoard.plusStep} puntos`;
      plusBtn.innerHTML = "<i class='bi bi-plus'></i>";
      plusBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        adjustScore(p.id, activeBoard.plusStep);
      });

      scoreWrap.appendChild(minusBtn);
      scoreWrap.appendChild(scoreDisplayWrapper);
      scoreWrap.appendChild(plusBtn);
      card.appendChild(scoreWrap);

      // Operational dropdown list actions
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "header-col actions text-end d-flex align-items-center justify-content-end gap-1";
      actionsDiv.style.width = "70px"; // On mobile, desktop size header column is hidden or scaled

      // Inline delete participant button
      const delParticipantBtn = document.createElement("button");
      delParticipantBtn.className = "btn-card-action text-danger";
      delParticipantBtn.title = "Eliminar Participante";
      delParticipantBtn.innerHTML = "<i class='bi bi-trash'></i>";
      delParticipantBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteParticipant(p.id);
      });

      actionsDiv.appendChild(delParticipantBtn);
      card.appendChild(actionsDiv);

      rankingsList.appendChild(card);
    });
  }

  // Enable direct editing on participant's score
  function enterScoreDirectEdit(participantId, container, originalScoreSpan) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const participant = activeBoard.participants.find(p => p.id === participantId);
    if (!participant) return;

    container.innerHTML = "";
    
    const input = document.createElement("input");
    input.type = "number";
    input.className = "score-edit-input";
    input.value = participant.score;
    container.appendChild(input);
    input.focus();
    input.select();

    const saveDirectEdit = () => {
      const val = parseInt(input.value);
      if (isNaN(val)) {
        // Rollback
        container.innerHTML = "";
        container.appendChild(originalScoreSpan);
        return;
      }
      
      const oldScore = participant.score;
      if (val !== oldScore) {
        participant.score = val;
        saveState();
        showToast(`Puntaje de ${participant.name} establecido en ${val}`);
        
        // Trigger subtle flash feedback animation after layout re-render
        renderDashboard();
        const flashClass = val > oldScore ? "flash-increment" : "flash-decrement";
        const cardEl = document.getElementById(`participant-card-${participantId}`);
        if (cardEl) {
          cardEl.classList.add(flashClass);
          setTimeout(() => cardEl.classList.remove(flashClass), 600);
        }
      } else {
        container.innerHTML = "";
        container.appendChild(originalScoreSpan);
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        saveDirectEdit();
      } else if (e.key === "Escape") {
        container.innerHTML = "";
        container.appendChild(originalScoreSpan);
      }
    });

    input.addEventListener("blur", () => {
      saveDirectEdit();
    });
  }

  // --- STATE MUTATION ACTIONS ---

  // Select board and refresh
  function selectLeaderboard(id) {
    if (state.leaderboards[id]) {
      state.activeBoardId = id;
      inputSearchFilter.value = ""; // Clear search when switching boards
      saveState();
      renderBoardsSelectors();
      renderDashboard();
    }
  }

  // Add participant to current leaderboard
  function addParticipant(name, initialScore) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const newParticipant = {
      id: "part_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      score: parseInt(initialScore) || 0
    };

    activeBoard.participants.push(newParticipant);
    saveState();
    renderDashboard();
    showToast(`Participante "${newParticipant.name}" añadido`);
  }

  // Adjust participant score by delta step
  function adjustScore(participantId, delta) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const participant = activeBoard.participants.find(p => p.id === participantId);
    if (!participant) return;

    participant.score += delta;
    saveState();

    // Trigger score flash background glow
    const cardEl = document.getElementById(`participant-card-${participantId}`);
    const flashClass = delta > 0 ? "flash-increment" : "flash-decrement";

    // Refresh totals stats immediately
    const totalPoints = activeBoard.participants.reduce((acc, p) => acc + p.score, 0);
    statPoints.textContent = totalPoints;

    // Render list (which re-sorts positions!)
    renderParticipants();

    // Keep flash animation active
    const newCardEl = document.getElementById(`participant-card-${participantId}`);
    if (newCardEl) {
      newCardEl.classList.add(flashClass);
      setTimeout(() => {
        newCardEl.classList.remove(flashClass);
      }, 600);
    }
  }

  // Delete participant from current leaderboard
  function deleteParticipant(participantId) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const index = activeBoard.participants.findIndex(p => p.id === participantId);
    if (index === -1) return;

    const name = activeBoard.participants[index].name;
    activeBoard.participants.splice(index, 1);
    saveState();
    renderDashboard();
    showToast(`Participante "${name}" eliminado`);
  }

  // Create new leaderboard
  function createLeaderboard(name, plusVal, minusVal) {
    const newId = generateUUID();
    state.leaderboards[newId] = {
      id: newId,
      name: name.trim(),
      plusStep: parseInt(plusVal) || 1,
      minusStep: parseInt(minusVal) || 1,
      sortOrder: "desc",
      participants: []
    };

    state.activeBoardId = newId;
    saveState();
    renderBoardsSelectors();
    renderDashboard();
    showToast(`Tabla de posiciones "${name.trim()}" creada con éxito`);
  }

  // Confirm and delete active leaderboard
  function deleteActiveLeaderboard() {
    const activeId = state.activeBoardId;
    const board = state.leaderboards[activeId];
    if (!board) return;

    delete state.leaderboards[activeId];

    // Pick another board as active if available
    const keys = Object.keys(state.leaderboards);
    state.activeBoardId = keys.length > 0 ? keys[0] : "";
    
    saveState();
    renderBoardsSelectors();
    renderDashboard();
    showToast(`Tabla de posiciones "${board.name}" eliminada`);
  }

  // --- ACTIONS SYNC AND EVENT BINDINGS ---

  // Handle side/mobile changes to active board title name
  function handleBoardNameChange(e) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const val = e.target.value.trim();
    if (val && val !== activeBoard.name) {
      activeBoard.name = val;
      saveState();
      lblBoardTitle.textContent = val;
      renderBoardsSelectors(); // Updates title inside select navigation list
    } else {
      // Revert if empty
      e.target.value = activeBoard.name;
    }
  }

  // Handle changes to plus/minus scoring modifiers
  function handleModifierChange(type, e) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;

    if (type === "plus") {
      activeBoard.plusStep = val;
    } else {
      activeBoard.minusStep = val;
    }
    
    saveState();
    syncSettingsInputs(); // Mirror to alternate viewports (Mobile vs Desktop)
    
    // Update labels details dynamically on round adjust buttons
    renderParticipants();
  }

  // Handle changes to sorting check radio inputs
  function handleSortOrderChange(e) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const order = e.target.value;
    if (order === "desc" || order === "asc") {
      activeBoard.sortOrder = order;
      saveState();
      syncSettingsInputs(); // Mirror inputs
      renderParticipants();
    }
  }

  // --- BACKUP UTILITIES (JSON IMPORT/EXPORT) ---

  // Export board data as downloadable JSON
  function exportDatabase() {
    if (Object.keys(state.leaderboards).length === 0) {
      showToast("No hay tablas para exportar", true);
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    
    const dateStr = new Date().toISOString().substring(0, 10);
    downloadAnchor.setAttribute("download", `rankflow_respaldo_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Base de datos exportada en formato JSON");
  }

  // Trigger JSON file input click
  function triggerImportFile() {
    fileImportInput.click();
  }

  // Handle uploaded JSON file import
  function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedState = JSON.parse(evt.target.result);
        
        // Structure validation checks
        if (importedState && typeof importedState === "object" && importedState.leaderboards) {
          state = importedState;
          
          // Verify activeBoardId is valid
          const boardKeys = Object.keys(state.leaderboards);
          if (boardKeys.length > 0) {
            if (!state.activeBoardId || !state.leaderboards[state.activeBoardId]) {
              state.activeBoardId = boardKeys[0];
            }
          } else {
            state.activeBoardId = "";
          }

          saveState();
          renderBoardsSelectors();
          renderDashboard();
          showToast("Base de datos importada con éxito!");
        } else {
          showToast("Archivo JSON no compatible. Estructura inválida.", true);
        }
      } catch (err) {
        console.error(err);
        showToast("Error al decodificar el archivo JSON.", true);
      }
      
      // Clear value so the same file can be uploaded again if needed
      fileImportInput.value = "";
    };
    reader.readAsText(file);
  }

  // --- MODALS ACTIONS TRIGGERS ---

  // Setup modal for creating a leaderboard
  function triggerNewBoardModal() {
    newBoardName.value = "";
    newPlusStep.value = "10";
    newMinusStep.value = "5";
    createModal.show();
  }

  // Setup deletion confirmation modal
  function triggerDeleteConfirmModal() {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    lblDeleteBoardTarget.textContent = activeBoard.name;
    deleteModal.show();
  }

  // --- EVENTS WIRE UP & LISTENERS BINDING ---

  // Synchronized controls bindings (Desktop vs Mobile)
  inputBoardName.addEventListener("change", handleBoardNameChange);
  mobileInputBoardName.addEventListener("change", handleBoardNameChange);

  inputPlusStep.addEventListener("change", (e) => handleModifierChange("plus", e));
  mobileInputPlusStep.addEventListener("change", (e) => handleModifierChange("plus", e));

  inputMinusStep.addEventListener("change", (e) => handleModifierChange("minus", e));
  mobileInputMinusStep.addEventListener("change", (e) => handleModifierChange("minus", e));

  // Sorting order radio triggers
  const sortRadios = ["sort-desc", "sort-asc", "mobile-sort-desc", "mobile-sort-asc"];
  sortRadios.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", handleSortOrderChange);
  });

  // Action buttons
  btnCreateBoardTrigger.addEventListener("click", triggerNewBoardModal);
  btnMobileCreateBoardTrigger.addEventListener("click", triggerNewBoardModal);
  btnCreateBoardFallback.addEventListener("click", triggerNewBoardModal);

  btnDeleteBoard.addEventListener("click", triggerDeleteConfirmModal);
  btnMobileDeleteBoard.addEventListener("click", triggerDeleteConfirmModal);
  btnConfirmDeleteBoard.addEventListener("click", () => {
    deleteActiveLeaderboard();
    deleteModal.hide();
  });

  // Backups
  btnExportBoard.addEventListener("click", exportDatabase);
  btnMobileExportBoard.addEventListener("click", exportDatabase);
  
  btnImportBoard.addEventListener("click", triggerImportFile);
  btnMobileImportBoard.addEventListener("click", triggerImportFile);
  fileImportInput.addEventListener("change", handleFileImport);

  // Form submission (Add Participant)
  formAddParticipant.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = inputNewName.value;
    const initialScore = parseInt(inputNewScore.value) || 0;
    
    if (name) {
      addParticipant(name, initialScore);
      inputNewName.value = "";
      inputNewScore.value = "0";
      inputNewName.focus();
    }
  });

  // Create board form inside Modal
  formCreateBoard.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = newBoardName.value;
    const plus = parseInt(newPlusStep.value) || 1;
    const minus = parseInt(newMinusStep.value) || 1;

    if (name) {
      createLeaderboard(name, plus, minus);
      createModal.hide();
    }
  });

  // Real-time Search filter
  inputSearchFilter.addEventListener("input", renderParticipants);
  btnClearSearch.addEventListener("click", () => {
    inputSearchFilter.value = "";
    renderParticipants();
    inputSearchFilter.focus();
  });

  // --- SIDEBAR COLLAPSE (Notion-style) ---
  const SIDEBAR_KEY = "rankflow_sidebar_collapsed";
  const desktopSidebar = document.getElementById("desktop-sidebar");
  const sidebarRail    = document.getElementById("sidebar-rail");
  const btnToggle      = document.getElementById("btn-toggle-sidebar");
  const toggleIcon     = document.getElementById("sidebar-toggle-icon");

  function setSidebarCollapsed(collapsed) {
    if (collapsed) {
      desktopSidebar.classList.add("sidebar-collapsed");
      sidebarRail.classList.add("rail-visible");
      toggleIcon.className = "bi bi-layout-sidebar-reverse";
      btnToggle.title = "Expandir panel";
    } else {
      desktopSidebar.classList.remove("sidebar-collapsed");
      sidebarRail.classList.remove("rail-visible");
      toggleIcon.className = "bi bi-layout-sidebar";
      btnToggle.title = "Colapsar panel";
    }
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }

  // Restore sidebar state from localStorage
  const storedCollapsed = localStorage.getItem(SIDEBAR_KEY) === "1";
  setSidebarCollapsed(storedCollapsed);

  btnToggle.addEventListener("click", () => {
    const isNowCollapsed = !desktopSidebar.classList.contains("sidebar-collapsed");
    setSidebarCollapsed(isNowCollapsed);
  });

  // Rail shortcut buttons
  document.getElementById("btn-rail-expand").addEventListener("click", () => setSidebarCollapsed(false));
  document.getElementById("btn-rail-new-board").addEventListener("click", triggerNewBoardModal);
  document.getElementById("btn-rail-export").addEventListener("click", exportDatabase);
  document.getElementById("btn-rail-import").addEventListener("click", triggerImportFile);
  document.getElementById("btn-rail-delete").addEventListener("click", triggerDeleteConfirmModal);

  // --- INLINE PARTICIPANT NAME EDITING ---
  function enterNameDirectEdit(participantId, container, nameSpan, editBtn, avatarEl) {
    const activeBoard = state.leaderboards[state.activeBoardId];
    if (!activeBoard) return;

    const participant = activeBoard.participants.find(p => p.id === participantId);
    if (!participant) return;

    // Hide the original name and edit button, show input
    nameSpan.style.display = "none";
    editBtn.style.display = "none";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "participant-name-edit-input";
    input.value = participant.name;
    input.maxLength = 50;
    container.insertBefore(input, nameSpan);
    input.focus();
    input.select();

    const saveNameEdit = () => {
      const newName = input.value.trim();
      if (newName && newName !== participant.name) {
        participant.name = newName;
        saveState();
        showToast(`Nombre actualizado a "${newName}"`);
        // Re-render to reflect new initials/avatar
        renderParticipants();
      } else {
        // Rollback
        input.remove();
        nameSpan.style.display = "";
        editBtn.style.display = "";
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveNameEdit(); }
      if (e.key === "Escape") {
        input.remove();
        nameSpan.style.display = "";
        editBtn.style.display = "";
      }
    });

    input.addEventListener("blur", saveNameEdit);
  }

  // --- INITIALIZATION ---
  loadState();
  renderBoardsSelectors();
  renderDashboard();
});
