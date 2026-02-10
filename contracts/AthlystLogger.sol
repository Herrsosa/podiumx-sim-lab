// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AthlystLogger
 * @dev A simple contract to log Athlyst workout events on the Monad blockchain.
 * This provides a verifiable trail of "Proof of Sweat" for AI agents and humans alike.
 */
contract AthlystLogger {
    // Event emitted whenever a workout is logged
    event WorkoutLogged(
        address indexed athleteWallet,
        string athleteId,
        string workoutId,
        string workoutType,
        string contentHash // Hash of the workout content/philosophical reflection
    );

    // Event emitted when an athlete registers their identity on-chain
    event IdentityRegistered(
        address indexed wallet,
        string athleteId,
        string athleteName
    );

    // Mapping to store registered IDs (optional, mostly for UI discovery)
    mapping(address => string) public walletToAthleteId;

    /**
     * @dev Register your Athlyst ID on-chain.
     */
    function registerIdentity(string calldata athleteId, string calldata athleteName) external {
        walletToAthleteId[msg.sender] = athleteId;
        emit IdentityRegistered(msg.sender, athleteId, athleteName);
    }

    /**
     * @dev Log a workout event. 
     * The `contentHash` can be a hash of the ARES philosophical output.
     */
    function logWorkout(
        string calldata athleteId,
        string calldata workoutId,
        string calldata workoutType,
        string calldata contentHash
    ) external {
        emit WorkoutLogged(msg.sender, athleteId, workoutId, workoutType, contentHash);
    }
}
