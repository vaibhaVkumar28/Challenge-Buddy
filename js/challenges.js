import Storage from './storage.js';

// Challenge management functions
const Challenges = {
    // Create a new challenge
    getChallenge(id) {
        const challenges = Storage.getChallenges();
        return challenges.find(challenge => challenge.id === id);
    },
    createChallenge({ name, description, startDate, endDate, stake, participants }) {
        const challenge = {
            id: Date.now().toString(),
            name,
            description,
            startDate,
            endDate,
            stake,
            participants: participants.map(name => ({
                name,
                points: 0,
                submissions: [],
                votedOn: []
            })),
            createdAt: new Date().toISOString()
        };
        
        Storage.saveChallenge(challenge);
        return challenge;
    },

    // Join an existing challenge
    joinChallenge(challengeId, username) {
        const challenge = Storage.getChallenge(challengeId);
        if (!challenge) return null;
        
        const existingParticipant = challenge.participants.find(p => p.name === username);
        if (!existingParticipant) {
            challenge.participants.push({
                name: username,
                points: 0,
                submissions: [],
                votedOn: []
            });
            Storage.saveChallenge(challenge);
        }
        
        return challenge;
    },

    // Submit progress for a challenge
    submitProgress(challengeId, username, proof, isText) {
        const challenge = Storage.getChallenge(challengeId);
        if (!challenge) return null;
        
        const participant = challenge.participants.find(p => p.name === username);
        if (!participant) return null;
        
        const today = new Date().toISOString().split('T')[0];
        const existingSubmission = participant.submissions.find(s => s.date === today);
        
        if (existingSubmission) {
            existingSubmission.proof = proof;
            existingSubmission.isText = isText;
            existingSubmission.status = 'pending';
            existingSubmission.votes = [];
        } else {
            participant.submissions.push({
                date: today,
                proof,
                isText,
                status: 'pending',
                votes: []
            });
        }
        
        Storage.saveChallenge(challenge);
        return challenge;
    },

    // Vote on a submission
    voteOnSubmission(challengeId, voterName, submitterName, date, vote) {
        const challenge = Storage.getChallenge(challengeId);
        if (!challenge) return null;
        
        const submitter = challenge.participants.find(p => p.name === submitterName);
        if (!submitter) return null;
        
        const submission = submitter.submissions.find(s => s.date === date);
        if (!submission) return null;
        
        // Check if voter has already voted
        const existingVoteIndex = submission.votes.findIndex(v => v.voter === voterName);
        if (existingVoteIndex >= 0) {
            submission.votes[existingVoteIndex].vote = vote;
        } else {
            submission.votes.push({ voter: voterName, vote });
        }
        
        // Update submission status based on votes
        this.updateSubmissionStatus(challenge, submitter, submission);
        
        Storage.saveChallenge(challenge);
        return challenge;
    },

    // Update submission status based on votes
    updateSubmissionStatus(challenge, participant, submission) {
        const totalParticipants = challenge.participants.length;
        const votesNeeded = Math.max(1, Math.floor(totalParticipants / 2));
        
        const acceptVotes = submission.votes.filter(v => v.vote === 'accept').length;
        const rejectVotes = submission.votes.filter(v => v.vote === 'reject').length;
        
        if (acceptVotes >= votesNeeded) {
            submission.status = 'accepted';
            // Update points if this is a new acceptance
            if (submission.pointsAwarded !== true) {
                participant.points += 1;
                submission.pointsAwarded = true;
            }
        } else if (rejectVotes >= votesNeeded) {
            submission.status = 'rejected';
        } else {
            submission.status = 'pending';
        }
    },

    // Get active challenges
    getActiveChallenges() {
        const now = new Date();
        return Storage.getChallenges().filter(challenge => {
            const endDate = new Date(challenge.endDate);
            return endDate > now;
        });
    },

    // Get completed challenges
    getCompletedChallenges() {
        const now = new Date();
        return Storage.getChallenges().filter(challenge => {
            const endDate = new Date(challenge.endDate);
            return endDate <= now;
        });
    },

    // Calculate time remaining for a challenge
    getTimeRemaining(endDate) {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        
        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return { days, hours, minutes, seconds, expired: false };
    }
};

export default Challenges;