import Challenges from './challenges.js';
import Storage from './storage.js';

// UI rendering functions
const UI = {
    // Initialize the app
    init() {
        this.setupEventListeners();
        this.navigateTo('dashboard');
    },

    // Set up event listeners
    setupEventListeners() {
        // Navigation buttons - use event delegation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-view]')) {
                const view = e.target.getAttribute('data-view');
                this.navigateTo(view);
            }
        });

        // Handle form submission via keyboard
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.getElementById('challenge-name')) {
                this.createChallenge();
            }
        });
    },

    // Navigate to a specific view
    navigateTo(view) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show the requested view
        const container = document.getElementById('app-container');
        container.innerHTML = '';
        
        switch (view) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'create-challenge':
                this.renderCreateChallengeForm();
                break;
            case 'challenge':
                // This will be handled by the challenge card click
                break;
            default:
                this.renderDashboard();
        }
    },

    // Render dashboard view
    renderDashboard() {
        const currentUser = Storage.getCurrentUser();
        const activeChallenges = Challenges.getActiveChallenges();
        const completedChallenges = Challenges.getCompletedChallenges();
        
        const html = `
            <div class="view active">
                <div class="card">
                    <h2>Welcome, ${currentUser}!</h2>
                    <p>Track your challenges and stay accountable with your group.</p>
                </div>
                
                <div class="card">
                    <h2>Active Challenges</h2>
                    ${activeChallenges.length > 0 ? 
                        this.renderChallengeList(activeChallenges) : 
                        '<p>No active challenges. Create or join one to get started!</p>'}
                </div>
                
                <div class="card">
                    <h2>Completed Challenges</h2>
                    ${completedChallenges.length > 0 ? 
                        this.renderChallengeList(completedChallenges, true) : 
                        '<p>No completed challenges yet.</p>'}
                </div>
            </div>
        `;
        
        document.getElementById('app-container').innerHTML = html;
        this.setupChallengeCardListeners();
    },

    // Render a list of challenges
    renderChallengeList(challenges, isCompleted = false) {
        return `
            <div class="challenge-list">
                ${challenges.map(challenge => this.renderChallengeCard(challenge, isCompleted)).join('')}
            </div>
        `;
    },

    // Render a single challenge card
    renderChallengeCard(challenge, isCompleted = false) {
        const timeRemaining = Challenges.getTimeRemaining(challenge.endDate);
        
        return `
            <div class="card challenge-card" data-id="${challenge.id}">
                <h3>${challenge.name}</h3>
                <p>${challenge.description || 'No description'}</p>
                <p><strong>Participants:</strong> ${challenge.participants.length}</p>
                
                ${isCompleted ? 
                    `<p class="timer">Challenge completed!</p>` :
                    `<div class="timer">
                        Time remaining: ${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m
                    </div>`
                }
                
                ${challenge.stake ? `<p><strong>Stake:</strong> ${challenge.stake}</p>` : ''}
            </div>
        `;
    },

    // Set up listeners for challenge cards
    setupChallengeCardListeners() {
        document.querySelectorAll('.challenge-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const challengeId = card.getAttribute('data-id');
                this.renderChallengeDetails(challengeId);
            });
        });
    },

    // Render challenge details view
    renderChallengeDetails(challengeId) {
        const challenge = Challenges.getChallenge(challengeId);
        if (!challenge) return this.navigateTo('dashboard');
        
        const currentUser = Storage.getCurrentUser();
        const isParticipant = challenge.participants.some(p => p.name === currentUser);
        const timeRemaining = Challenges.getTimeRemaining(challenge.endDate);
        const isCompleted = timeRemaining.expired;
        
        // Check if current user has submitted for today
        const today = new Date().toISOString().split('T')[0];
        const participant = challenge.participants.find(p => p.name === currentUser);
        const hasSubmittedToday = participant ? 
            participant.submissions.some(s => s.date === today) : false;
        
        // Get pending submissions that current user hasn't voted on
        const pendingSubmissions = [];
        if (isParticipant) {
            challenge.participants.forEach(p => {
                p.submissions.forEach(sub => {
                    if (sub.status === 'pending') {
                        const hasVoted = sub.votes.some(v => v.voter === currentUser);
                        if (!hasVoted && p.name !== currentUser) {
                            pendingSubmissions.push({
                                submitter: p.name,
                                date: sub.date,
                                proof: sub.proof,
                                isText: sub.isText
                            });
                        }
                    }
                });
            });
        }
        
        const html = `
            <div class="view active">
                <div class="card">
                    <button onclick="UI.navigateTo('dashboard')">← Back to Dashboard</button>
                    <h2>${challenge.name}</h2>
                    <p>${challenge.description || 'No description'}</p>
                    
                    <div class="timer">
                        ${isCompleted ? 
                            'Challenge completed!' : 
                            `Ends in: ${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`}
                    </div>
                    
                    ${challenge.stake ? `<p><strong>Stake:</strong> ${challenge.stake}</p>` : ''}
                    
                    <h3>Participants (${challenge.participants.length})</h3>
                    <ul>
                        ${challenge.participants.map(participant => `
                            <div class="card participant-card">
                                <h3>${participant.name}'s Progress</h3>
                                <p>Points: ${participant.points}</p>
                                
                                ${participant.name === currentUser ? `
                                    <!-- Current user's submission form -->
                                    ${this.renderSubmissionForm(challengeId, participant, today)}
                                ` : `
                                    <!-- Other participants' view -->
                                    ${this.renderOtherParticipantView(participant)}
                                `}
                                
                                <h4>Submissions</h4>
                                ${participant.submissions.length > 0 ? 
                                    participant.submissions.map(sub => this.renderSubmission(sub)).join('') : 
                                    '<p>No submissions yet.</p>'}
                            </div>
                        `).join('')}
                    </ul>
                    
                    ${!isParticipant ? `
                        <button onclick="UI.joinChallenge('${challenge.id}')">Join Challenge</button>
                    ` : ''}
                </div>
                
                ${isParticipant ? `
                    <div class="card">
                        <h3>Your Progress</h3>
                        <p>Points: ${participant.points}</p>
                        
                        ${!isCompleted ? `
                            ${hasSubmittedToday ? `
                                <p>You've already submitted for today.</p>
                            ` : `
                                <div class="form-group">
                                    <label for="proof-text">Submit Today's Progress (Text)</label>
                                    <textarea id="proof-text" rows="4"></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="proof-image">Or Upload Image URL</label>
                                    <input type="text" id="proof-image" placeholder="Paste image URL">
                                </div>
                                <button onclick="UI.submitProgress('${challenge.id}', 'text')">Submit Text Proof</button>
                                <button onclick="UI.submitProgress('${challenge.id}', 'image')">Submit Image Proof</button>
                            `}
                        ` : ''}
                        
                        <h4>Your Submissions</h4>
                        ${participant.submissions.length > 0 ? 
                            participant.submissions.map(sub => `
                                <div class="submission">
                                    <p><strong>${sub.date}</strong> - ${sub.status}</p>
                                    ${sub.isText ? 
                                        `<p>${sub.proof}</p>` : 
                                        `<img src="${sub.proof}" alt="Proof image">`}
                                </div>
                            `).join('') : 
                            '<p>No submissions yet.</p>'}
                    </div>
                ` : ''}
                
                ${pendingSubmissions.length > 0 ? `
                    <div class="card">
                        <h3>Pending Submissions to Review</h3>
                        ${pendingSubmissions.map(sub => `
                            <div class="submission">
                                <p><strong>${sub.submitter} - ${sub.date}</strong></p>
                                ${sub.isText ? 
                                    `<p>${sub.proof}</p>` : 
                                    `<img src="${sub.proof}" alt="Proof image">`}
                                <div class="vote-buttons">
                                    <button class="btn-success" 
                                        onclick="UI.voteOnSubmission('${challenge.id}', '${sub.submitter}', '${sub.date}', 'accept')">
                                        ✅ Accept
                                    </button>
                                    <button class="btn-danger" 
                                        onclick="UI.voteOnSubmission('${challenge.id}', '${sub.submitter}', '${sub.date}', 'reject')">
                                        ❌ Reject
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${isCompleted ? `
                    <div class="card">
                        <h3>Final Results</h3>
                        ${this.renderLeaderboard(challenge)}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('app-container').innerHTML = html;
    },

    renderSubmissionForm(challengeId, participant, today) {
        const hasSubmittedToday = participant.submissions.some(s => s.date === today);
        
        if (hasSubmittedToday) {
            return '<p>You\'ve already submitted for today.</p>';
        }
        
        return `
            <div class="submission-form">
                <textarea id="proof-text-${participant.name}" placeholder="Describe your progress"></textarea>
                <input type="text" id="proof-image-${participant.name}" placeholder="Or paste image URL">
                <button onclick="UI.submitProgress('${challengeId}', '${participant.name}', 'text')">
                    Submit Text
                </button>
                <button onclick="UI.submitProgress('${challengeId}', '${participant.name}', 'image')">
                    Submit Image
                </button>
            </div>
        `;
    },

    renderOtherParticipantView(participant) {
        return `
            <div class="other-participant">
                <p>${participant.name} can submit their work through their own device</p>
            </div>
        `;
    },

    renderSubmission(submission) {
        return `
            <div class="submission">
                <p><strong>${submission.date}</strong> - ${submission.status}</p>
                ${submission.isText ? 
                    `<p>${submission.proof}</p>` : 
                    `<img src="${submission.proof}" alt="Proof image">`}
            </div>
        `;
    },

    // Render leaderboard for a challenge
    renderLeaderboard(challenge) {
        // Sort participants by points
        const sortedParticipants = [...challenge.participants].sort((a, b) => b.points - a.points);
        
        return `
            <table class="leaderboard">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Participant</th>
                        <th>Points</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedParticipants.map((p, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${p.name}</td>
                            <td>${p.points}</td>
                            <td>${p.points > 0 ? 'Completed' : 'Did not complete'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // Render create challenge form
    renderCreateChallengeForm() {
        const currentUser = Storage.getCurrentUser();
        
        const html = `
            <div class="view active">
                <button onclick="UI.navigateTo('dashboard')" class="back-button">← Back to Dashboard</button>
                <div class="card">
                    <h2>Create New Challenge</h2>
                    
                    <form id="create-challenge-form">
                        <div class="form-group">
                            <label for="challenge-name">Challenge Name*</label>
                            <input type="text" id="challenge-name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="challenge-description">Description (Optional)</label>
                            <textarea id="challenge-description" rows="3"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="start-date">Start Date*</label>
                            <input type="date" id="start-date" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="end-date">End Date*</label>
                            <input type="date" id="end-date" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="stake">What's at Stake? (Optional)</label>
                            <input type="text" id="stake" placeholder="E.g., Loser buys pizza">
                        </div>
                        
                        <div class="form-group">
                            <label>Participants</label>
                            <div class="add-participant">
                                <input type="text" id="new-participant" placeholder="Add participant username">
                                <button type="button" onclick="UI.addParticipant()">Add</button>
                            </div>
                            <ul id="participants-list">
                                <li>${currentUser} (you)</li>
                            </ul>
                        </div>
                        
                        <button type="button" onclick="UI.createChallenge()" class="create-button">Create Challenge</button>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('app-container').innerHTML = html;
        
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekFormatted = nextWeek.toISOString().split('T')[0];
        
        document.getElementById('start-date').value = today;
        document.getElementById('end-date').value = nextWeekFormatted;
        
        // Focus on the first field
        document.getElementById('challenge-name').focus();
    },

    // Add participant to the form
    addParticipant() {
        const input = document.getElementById('new-participant');
        const username = input.value.trim();
        
        if (username) {
            const list = document.getElementById('participants-list');
            const currentUser = Storage.getCurrentUser();
            
            // Normalize all names for comparison
            const existingParticipants = Array.from(list.children).map(li => {
                const text = li.textContent.trim();
                return text.endsWith('(you)') ? text.replace('(you)', '').trim() : text;
            });
            
            // Check for duplicates and don't allow adding current user
            if (username !== currentUser && 
                !existingParticipants.some(name => name === username)) {
                
                const li = document.createElement('li');
                li.textContent = username;
                list.appendChild(li);
                
                input.value = '';
                input.focus();
            } else {
                alert(`${username} is already a participant or is you!`);
            }
        }
    },

    // Create a new challenge from form data
    createChallenge() {
        try {
            const name = document.getElementById('challenge-name').value.trim();
            const description = document.getElementById('challenge-description').value.trim();
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            const stake = document.getElementById('stake').value.trim();

            if (!name || !startDate || !endDate) {
                alert('Please fill in all required fields');
                return;
            }

            // Validate dates
            if (new Date(startDate) >= new Date(endDate)) {
                alert('End date must be after start date');
                return;
            }

            const currentUser = Storage.getCurrentUser();
            const participantsList = document.getElementById('participants-list');
            const otherParticipants = Array.from(participantsList.children)
                .filter(li => !li.textContent.includes('(you)'))
                .map(li => li.textContent.trim());

            const participants = [currentUser, ...otherParticipants];

            Challenges.createChallenge({
                name,
                description,
                startDate,
                endDate,
                stake,
                participants
            });

            this.navigateTo('dashboard');
        } catch (error) {
            console.error('Error creating challenge:', error);
            alert('An error occurred while creating the challenge');
        }
    },

    // Join a challenge
    joinChallenge(challengeId) {
        const currentUser = Storage.getCurrentUser();
        Challenges.joinChallenge(challengeId, currentUser);
        this.renderChallengeDetails(challengeId);
    },

    // Submit progress for a challenge
    submitProgress(challengeId, type) {
        const currentUser = Storage.getCurrentUser();
        let proof = '';
        let isText = true;
        
        if (type === 'text') {
            proof = document.getElementById('proof-text').value.trim();
            if (!proof) {
                alert('Please enter your progress text');
                return;
            }
        } else {
            proof = document.getElementById('proof-image').value.trim();
            if (!proof) {
                alert('Please enter an image URL');
                return;
            }
            isText = false;
        }
        
        Challenges.submitProgress(challengeId, currentUser, proof, isText);
        this.renderChallengeDetails(challengeId);
    },

    // Vote on a submission
    voteOnSubmission(challengeId, submitter, date, vote) {
        const currentUser = Storage.getCurrentUser();
        Challenges.voteOnSubmission(challengeId, currentUser, submitter, date, vote);
        this.renderChallengeDetails(challengeId);
    }
};

// Make UI methods available globally
window.UI = UI;

export default UI;