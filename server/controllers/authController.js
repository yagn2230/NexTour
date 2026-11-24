// controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userSchme");

const registerUser = async (req, res) => {
    try {
        const { fullName, password, phone } = req.body;
        const normalizedEmail = typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

        // Check required fields
        if (!fullName || !normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        // Check existing user
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            fullName,
            email: normalizedEmail,
            phone: typeof phone === "string" ? phone.trim() : "",
            password: hashedPassword,
            role: "User"
        });

        res.status(201).json({
            success: true,
            message: "Registration Successful",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Registration failed:", error);
        res.status(500).json({
            success: false,
            message: "Unable to complete registration."
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { password } = req.body;
        const email = typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

        // Check email
        const user = await User.findOne({ email });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Create Session
        req.session.user = {
            id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            organizerVerified: Boolean(user.organizerVerified),
            organizerVerificationStatus: user.organizerVerificationStatus || "Not Applied",
            organizer: {
                isOrganizer: Boolean(user.organizer?.isOrganizer),
                status: user.organizer?.status || "Not Applied",
            },
        };

        req.session.save((sessionErr) => {
            if (sessionErr) {
                return res.status(500).json({
                    success: false,
                    message: "Login failed while saving session."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Login Successful",
                user: req.session.user,
                ...(process.env.JWT_SECRET
                    ? {
                        token: jwt.sign(
                            { id: user._id.toString(), role: user.role },
                            process.env.JWT_SECRET,
                            { expiresIn: "1d" }
                        ),
                    }
                    : {})
            });
        });

    } catch (error) {
        console.error("Login failed:", error);
        res.status(500).json({
            success: false,
            message: "Unable to complete login."
        });
    }
};

const logoutUser = (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: "Logout Failed"
            });
        }

        res.clearCookie("connect.sid");

        res.status(200).json({
            success: true,
            message: "Logout Successful"
        });

    });

};

// Get Logged In User Profile

const getProfile = async (req, res) => {
    try {

        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        // Get user from database
        const user = await User.findById(req.session.user.id).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load your account."
        });

    }
};


module.exports = {
    registerUser,
    loginUser,
    getProfile,
    logoutUser
};