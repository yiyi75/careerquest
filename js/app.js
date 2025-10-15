class CareerQuestApp {
    constructor() {
        this.questManager = new QuestManager();
        this.uiManager = new UIManager(this.questManager);
        this.init();
    }

    init() {
        // Load saved data
        this.questManager.loadFromLocalStorage();
        
        // Check if there's an existing quest
        if (this.questManager.currentQuest) {
            this.uiManager.showQuestProgress();
            this.uiManager.renderQuestProgress();
        } else {
            // Add first stage by default
            this.uiManager.addStage();
        }
        
        // Update player stats
        this.uiManager.updatePlayerStats();
        this.uiManager.renderAchievements();
        
        console.log('Career Quest App initialized!');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CareerQuestApp();
});