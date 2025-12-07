"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";
import {
  fetchFriendsCircle,
  addFriend,
  removeFriend,
  type Friend,
} from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function FriendsCircle() {
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const { data: circle, isLoading } = useQuery({
    queryKey: ["friendsCircle", account?.address],
    queryFn: () => fetchFriendsCircle(account!.address),
    enabled: !!account?.address,
    refetchInterval: 30000,
  });

  const addMutation = useMutation({
    mutationFn: ({ friendAddress, label }: { friendAddress: string; label: string }) =>
      addFriend(account!.address, friendAddress, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendsCircle"] });
      toast.success("Friend Added", "Successfully added to your circle!");
      setNewAddress("");
      setNewLabel("");
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to Add", error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (friendAddress: string) => removeFriend(account!.address, friendAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendsCircle"] });
      toast.success("Friend Removed", "Removed from your circle");
    },
    onError: (error: Error) => {
      toast.error("Failed to Remove", error.message);
    },
  });

  const handleAddFriend = useCallback(() => {
    if (!newAddress || !newLabel) {
      toast.warning("Missing Info", "Please enter both address and label");
      return;
    }
    addMutation.mutate({ friendAddress: newAddress, label: newLabel });
  }, [newAddress, newLabel, addMutation, toast]);

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!account) {
    return (
      <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
        <span style={{ fontSize: "3rem", display: "block", marginBottom: "16px" }}>
          👥
        </span>
        <p style={{ color: "#94a3b8", marginBottom: "8px" }}>Connect your wallet to manage your friends circle</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="mobile-friend-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", minWidth: "200px" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "white", marginBottom: "4px" }}>
            Your Friends Circle
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Track your friends&apos; predictions across markets
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: showAddForm
              ? "rgba(239, 68, 68, 0.2)"
              : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            color: showAddForm ? "#f87171" : "white",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {showAddForm ? (
            <>
              <span>✕</span> Cancel
            </>
          ) : (
            <>
              <span>+</span> Add Friend
            </>
          )}
        </button>
      </div>

      {/* Add Friend Form */}
      {showAddForm && (
        <div
          className="glass-card"
          style={{
            padding: "20px",
            marginBottom: "24px",
            border: "1px solid rgba(59, 130, 246, 0.3)",
          }}
        >
          <h4 style={{ color: "white", fontWeight: "600", marginBottom: "16px" }}>
            Add a Friend to Your Circle
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "0.875rem", display: "block", marginBottom: "6px" }}>
                Wallet Address
              </label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="0x..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(100, 160, 220, 0.3)",
                  background: "rgba(15, 30, 55, 0.8)",
                  color: "white",
                  fontSize: "0.95rem",
                }}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "0.875rem", display: "block", marginBottom: "6px" }}>
                Label (how you know them)
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Jake (Tahoe Crew)"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(100, 160, 220, 0.3)",
                  background: "rgba(15, 30, 55, 0.8)",
                  color: "white",
                  fontSize: "0.95rem",
                }}
              />
            </div>
            <button
              onClick={handleAddFriend}
              disabled={addMutation.isPending}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                fontWeight: "600",
                cursor: addMutation.isPending ? "wait" : "pointer",
                opacity: addMutation.isPending ? 0.7 : 1,
              }}
            >
              {addMutation.isPending ? "Adding..." : "Add to Circle"}
            </button>
          </div>
        </div>
      )}

      {/* Friends List */}
      {isLoading ? (
        <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "#94a3b8" }}>Loading your circle...</p>
        </div>
      ) : !circle?.friends || circle.friends.length === 0 ? (
        <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: "16px" }}>
            👥
          </span>
          <p style={{ color: "#94a3b8", marginBottom: "8px" }}>Your circle is empty</p>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Add friends to see their predictions and compete!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {circle.friends.map((friend: Friend) => (
            <div
              key={friend.address}
              className="glass-card mobile-friend-card"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Avatar */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  {friend.label.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "white", fontWeight: "600" }}>
                      {friend.label}
                    </span>
                    {friend.nickname && (
                      <span
                        style={{
                          background: "rgba(251, 191, 36, 0.2)",
                          color: "#fbbf24",
                          padding: "2px 8px",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                        }}
                      >
                        {friend.nickname}
                      </span>
                    )}
                  </div>
                  <span style={{ color: "#64748b", fontSize: "0.85rem", fontFamily: "monospace" }}>
                    {shortenAddress(friend.address)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => removeMutation.mutate(friend.address)}
                disabled={removeMutation.isPending}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#f87171",
                  cursor: removeMutation.isPending ? "wait" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {circle?.friends && circle.friends.length > 0 && (
        <div
          style={{
            marginTop: "24px",
            padding: "16px 20px",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ color: "#38bdf8", fontSize: "1.5rem", fontWeight: "700" }}>
              {circle.friends.length}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Friends</div>
          </div>
          <div>
            <div style={{ color: "#a78bfa", fontSize: "1.5rem", fontWeight: "700" }}>
              {circle.friends.filter((f: Friend) => f.nickname).length}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>On Leaderboard</div>
          </div>
        </div>
      )}
    </div>
  );
}
