import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    quantity: { type: Number, min: 1 },
    plantType: { type: String, trim: true },
    specificPlant: { type: String, trim: true },
    deadline: { type: Date },
    comments: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'new', 'confirmed', 'in-progress', 'completed', 'cancelled'],
      default: 'draft'
    },
    vkUserId: { type: Number, required: true },
    vkPeerId: { type: Number, required: true },
    source: { type: String, default: 'vk_bot' },
    adminNotes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
