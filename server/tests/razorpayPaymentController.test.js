const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { test } = require("node:test");
const BookingPayment = require("../models/BookingPayment");
const Trip = require("../models/Trip");
const User = require("../models/userSchme");
const razorpayService = require("../services/razorpay");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
} = require("../controllers/bookingPaymentController");

const invoke = (handler, req) => new Promise((resolve, reject) => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      resolve(this);
      return this;
    },
  };
  handler(req, response, reject);
});

const mockSession = () => ({
  withTransaction: async (operation) => operation(),
  endSession: async () => {},
});

const queryFor = (value) => ({
  session: async () => value,
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

const paymentSignature = (orderId, paymentId, secret) => crypto
  .createHmac("sha256", secret)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");

test("Razorpay order creation uses the saved booking amount and authenticated traveler", async () => {
  const originals = {
    findOne: BookingPayment.findOne,
    getClient: razorpayService.getRazorpayClient,
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  };
  const travelerId = new mongoose.Types.ObjectId();
  const booking = {
    _id: new mongoose.Types.ObjectId(),
    traveler: travelerId,
    amount: 125.5,
    paymentMethod: "Demo",
    paymentStatus: "Pending",
    bookingStatus: "Accepted",
    razorpayOrderId: "",
    transactionHistory: [],
    save: async () => booking,
  };
  const orderId = "order_test123";
  try {
    process.env.RAZORPAY_KEY_ID = "rzp_test_id";
    process.env.RAZORPAY_KEY_SECRET = "test-secret";
    BookingPayment.findOne = (filter) => {
      assert.equal(filter.traveler.toString(), travelerId.toString());
      assert.equal(filter.bookingStatus, "Accepted");
      return Promise.resolve(booking);
    };
    razorpayService.getRazorpayClient = () => ({
      orders: {
        create: async (order) => {
          assert.equal(order.amount, 12550);
          assert.equal(order.currency, "INR");
          assert.equal(order.notes.bookingId, booking._id.toString());
          return { id: orderId, amount: 12550, currency: "INR", status: "created" };
        },
      },
    });

    const response = await invoke(createRazorpayOrder, {
      authUser: { id: travelerId.toString() },
      params: { bookingId: booking._id.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.orderId, orderId);
    assert.equal(response.body.data.keyId, "rzp_test_id");
    assert.equal(booking.paymentMethod, "Razorpay");
    assert.equal(booking.razorpayOrderId, orderId);
  } finally {
    BookingPayment.findOne = originals.findOne;
    razorpayService.getRazorpayClient = originals.getClient;
    if (originals.keyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = originals.keyId;
    if (originals.keySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = originals.keySecret;
  }
});

test("valid Razorpay signatures confirm only captured payments", async () => {
  const originals = {
    findOne: BookingPayment.findOne,
    startSession: mongoose.startSession,
    tripFindById: Trip.findById,
    userUpdateOne: User.updateOne,
    getClient: razorpayService.getRazorpayClient,
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  };
  const travelerId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const booking = {
    _id: new mongoose.Types.ObjectId(),
    traveler: travelerId,
    organizer: organizerId,
    trip: tripId,
    amount: 125,
    paymentMethod: "Razorpay",
    paymentStatus: "Pending",
    bookingStatus: "Accepted",
    razorpayOrderId: "order_test123",
    razorpayPaymentId: "",
    transactionHistory: [],
    save: async () => booking,
  };
  const paymentId = "pay_test123";
  const notifications = [];
  let capturedAmount;
  try {
    process.env.RAZORPAY_KEY_ID = "rzp_test_id";
    process.env.RAZORPAY_KEY_SECRET = "test-secret";
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = () => queryFor(booking);
    Trip.findById = () => ({
      select: () => ({ session: async () => ({ title: "Test trip" }) }),
    });
    User.updateOne = async (filter, update) => {
      notifications.push({ filter, update });
      return { matchedCount: 1 };
    };
    razorpayService.getRazorpayClient = () => ({
      payments: {
        fetch: async () => ({
          id: paymentId,
          order_id: booking.razorpayOrderId,
          amount: 12500,
          currency: "INR",
          status: "authorized",
        }),
        capture: async (id, amount, currency) => {
          capturedAmount = { id, amount, currency };
          return {
            id: paymentId,
            order_id: booking.razorpayOrderId,
            amount,
            currency,
            status: "captured",
          };
        },
      },
    });

    const response = await invoke(verifyRazorpayPayment, {
      authUser: { id: travelerId.toString() },
      params: { bookingId: booking._id.toString() },
      body: {
        razorpay_order_id: booking.razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: paymentSignature(booking.razorpayOrderId, paymentId, process.env.RAZORPAY_KEY_SECRET),
      },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(capturedAmount, { id: paymentId, amount: 12500, currency: "INR" });
    assert.equal(booking.paymentStatus, "Paid");
    assert.equal(booking.bookingStatus, "Confirmed");
    assert.equal(booking.razorpayPaymentId, paymentId);
    assert.equal(notifications.length, 2);
  } finally {
    BookingPayment.findOne = originals.findOne;
    mongoose.startSession = originals.startSession;
    Trip.findById = originals.tripFindById;
    User.updateOne = originals.userUpdateOne;
    razorpayService.getRazorpayClient = originals.getClient;
    if (originals.keyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = originals.keyId;
    if (originals.keySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = originals.keySecret;
  }
});

test("Razorpay webhook rejects invalid signatures before processing payment events", async () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const originalGetClient = razorpayService.getRazorpayClient;
  try {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
    razorpayService.getRazorpayClient = () => {
      throw new Error("Webhook should not process an invalid signature.");
    };
    const response = await invoke(handleRazorpayWebhook, {
      rawBody: Buffer.from('{"event":"payment.captured"}'),
      body: { event: "payment.captured" },
      get: () => "invalid",
    });
    assert.equal(response.statusCode, 400);
    assert.match(response.body.message, /invalid.*signature/i);
  } finally {
    razorpayService.getRazorpayClient = originalGetClient;
    if (originalSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
  }
});

test("captured Razorpay webhooks refund payments for bookings cancelled before capture", async () => {
  const originals = {
    findOne: BookingPayment.findOne,
    findOneAndUpdate: BookingPayment.findOneAndUpdate,
    updateOne: BookingPayment.updateOne,
    startSession: mongoose.startSession,
    userUpdateOne: User.updateOne,
    getClient: razorpayService.getRazorpayClient,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  };
  const travelerId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const booking = {
    _id: bookingId,
    traveler: travelerId,
    organizer: organizerId,
    trip: tripId,
    amount: 125,
    bookingStatus: "Cancelled",
    paymentStatus: "Cancelled",
    razorpayOrderId: "order_test123",
    razorpayRefundId: "",
    razorpayRefundPending: false,
  };
  const payment = {
    id: "pay_test123",
    order_id: booking.razorpayOrderId,
    amount: 12500,
    currency: "INR",
    status: "captured",
  };
  const rawBody = Buffer.from(JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: payment } },
  }));
  const notifications = [];
  try {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
    process.env.RAZORPAY_KEY_ID = "rzp_test_id";
    process.env.RAZORPAY_KEY_SECRET = "test-secret";
    mongoose.startSession = async () => mockSession();
    BookingPayment.findOne = () => queryFor(booking);
    BookingPayment.findOneAndUpdate = async (filter, update) => {
      if (update.$set.razorpayRefundPending) {
        booking.razorpayRefundPending = true;
        booking.razorpayPaymentId = update.$set.razorpayPaymentId;
        return booking;
      }
      booking.razorpayRefundId = update.$set.razorpayRefundId;
      booking.razorpayRefundPending = false;
      booking.paymentStatus = update.$set.paymentStatus;
      return booking;
    };
    BookingPayment.updateOne = async () => ({ matchedCount: 1 });
    User.updateOne = async (filter, update) => {
      notifications.push({ filter, update });
      return { matchedCount: 1 };
    };
    razorpayService.getRazorpayClient = () => ({
      payments: {
        fetchMultipleRefund: async () => ({ items: [] }),
        refund: async (id, params) => {
          assert.equal(id, payment.id);
          assert.equal(params.notes.bookingId, bookingId.toString());
          return { id: "rfnd_test123", status: "processed" };
        },
      },
    });

    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    const response = await invoke(handleRazorpayWebhook, {
      rawBody,
      body: JSON.parse(rawBody.toString()),
      get: () => signature,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.status, "refunded");
    assert.equal(booking.paymentStatus, "Refunded");
    assert.equal(booking.razorpayRefundId, "rfnd_test123");
    assert.equal(notifications.length, 2);
  } finally {
    BookingPayment.findOne = originals.findOne;
    BookingPayment.findOneAndUpdate = originals.findOneAndUpdate;
    BookingPayment.updateOne = originals.updateOne;
    mongoose.startSession = originals.startSession;
    User.updateOne = originals.userUpdateOne;
    razorpayService.getRazorpayClient = originals.getClient;
    if (originals.webhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = originals.webhookSecret;
    if (originals.keyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = originals.keyId;
    if (originals.keySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = originals.keySecret;
  }
});
