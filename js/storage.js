// localStorage wrapper with helper methods
const Storage = {
    // Get all challenges
    getChallenges() {
        return JSON.parse(localStorage.getItem('challenges')) || [];
    },

    // Save all challenges
    saveChallenges(challenges) {
        localStorage.setItem('challenges', JSON.stringify(challenges));
    },

    // Get a single challenge by ID
    getChallenge(id) {
        const challenges = this.getChallenges();
        return challenges.find(challenge => challenge.id === id);
    },

    // Save a single challenge (add or update)
    saveChallenge(updatedChallenge) {
        const challenges = this.getChallenges();
        const index = challenges.findIndex(c => c.id === updatedChallenge.id);
        
        if (index >= 0) {
            challenges[index] = updatedChallenge;
        } else {
            challenges.push(updatedChallenge);
        }
        
        this.saveChallenges(challenges);
    },

    // Get current user
    getCurrentUser() {
        return localStorage.getItem('currentUser') || 'Anonymous';
    },

    // Set current user
    setCurrentUser(username) {
        localStorage.setItem('currentUser', username);
    },

    // Get all users
    getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    },

    // Save all users
    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    }
};

export default Storage;