// characterManager.js
class CharacterManager {
    constructor() {
        this.characters = this.getCharacterData();
        this.selectedCharacter = null;
    }

    getCharacterData() {
        return [
            {
                id: 'coder',
                name: 'Code Explorer',
                type: 'Tech Adventurer',
                description: 'A curious developer ready to debug any challenge and build amazing projects.',
                emoji: '👨‍💻',
                unlocked: true
            },
            {
                id: 'designer',
                name: 'Pixel Artist',
                type: 'Creative Visionary',
                description: 'Turns ideas into beautiful interfaces and memorable user experiences.',
                emoji: '👩‍🎨',
                unlocked: true
            },
            {
                id: 'analyst',
                name: 'Data Detective',
                type: 'Insight Seeker',
                description: 'Loves uncovering patterns and telling stories with data.',
                emoji: '🔍',
                unlocked: true
            },
            {
                id: 'leader',
                name: 'Team Captain',
                type: 'Project Navigator',
                description: 'Guides teams to success with clear vision and strong communication.',
                emoji: '👑',
                unlocked: true
            },
            {
                id: 'writer',
                name: 'Story Weaver',
                type: 'Content Creator',
                description: 'Crafts compelling narratives and clear communication.',
                emoji: '📝',
                unlocked: true
            },
            {
                id: 'scientist',
                name: 'Research Ranger',
                type: 'Knowledge Hunter',
                description: 'Driven by curiosity and the pursuit of new discoveries.',
                emoji: '🔬',
                unlocked: true
            }
        ];
    }

    renderCharacterSelection() {
        const grid = document.getElementById('characterGrid');
        if (!grid) {
            console.error('Character grid element not found!');
            return;
        }
        
        grid.innerHTML = '';

        this.characters.forEach(character => {
            const characterElement = document.createElement('div');
            characterElement.className = `character-option ${character.unlocked ? '' : 'locked'}`;
            characterElement.innerHTML = `
                <div class="pixel-character">
                    <span style="font-size: 2em;">${character.emoji}</span>
                </div>
                <div class="character-name">${character.name}</div>
                <div class="character-type">${character.type}</div>
            `;

            if (character.unlocked) {
                characterElement.addEventListener('click', () => this.selectCharacter(character));
            }

            grid.appendChild(characterElement);
        });
    }

    // Update the selectCharacter method
    selectCharacter(character) {
        this.selectedCharacter = character;
        
        // Update UI
        document.querySelectorAll('.character-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        // Update preview
        const preview = document.getElementById('selectedCharacterPreview');
        const name = document.getElementById('selectedCharacterName');
        const description = document.getElementById('selectedCharacterDescription');
        
        if (preview) {
            preview.innerHTML = `<span style="font-size: 3em;">${character.emoji}</span>`;
        }
        if (name) {
            name.textContent = character.name;
        }
        if (description) {
            description.textContent = character.description;
        }
        
        // Enable confirm button
        const confirmBtn = document.getElementById('confirmCharacterBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }

    // Update the addCharacterToProgressPanel method
    addCharacterToProgressPanel() {
        if (!this.selectedCharacter) return;
        
        // Remove existing character if any
        const existingCharacter = document.querySelector('.quest-character');
        if (existingCharacter) {
            existingCharacter.remove();
        }

        const characterElement = document.createElement('div');
        characterElement.className = 'quest-character';
        characterElement.innerHTML = `
            <div class="pixel-character character-float">
                <span style="font-size: 2.5em;">${this.selectedCharacter.emoji}</span>
            </div>
        `;
        
        // Add to the main app container (background level)
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.appendChild(characterElement);
        }
    }

    confirmSelection() {
        if (!this.selectedCharacter) return false;
        
        // Save character selection
        localStorage.setItem('selectedCharacter', JSON.stringify(this.selectedCharacter));
        return true;
    }


    loadSelectedCharacter() {
        const saved = localStorage.getItem('selectedCharacter');
        if (saved) {
            try {
                this.selectedCharacter = JSON.parse(saved);
                return true;
            } catch (error) {
                console.error('Error loading character:', error);
                return false;
            }
        }
        return false;
    }

    hasSelectedCharacter() {
        return this.loadSelectedCharacter();
    }

    getSelectedCharacter() {
        return this.selectedCharacter;
    }

    // Reset character selection
    resetCharacter() {
        localStorage.removeItem('selectedCharacter');
        this.selectedCharacter = null;
        document.querySelector('.quest-character')?.remove();
    }
}