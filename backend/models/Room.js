const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Oda adı zorunludur'],
            trim: true,
            unique: true,
            minlength: [2, 'Oda adı en az 2 karakter olmalıdır'],
            maxlength: [100, 'Oda adı en fazla 100 karakter olabilir'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [200, 'Açıklama en fazla 200 karakter olabilir'],
            default: '',
        },
        type: {
            type: String,
            enum: ['general', 'random', 'tech', 'custom', 'private'],
            default: 'custom',
        },
        icon: {
            type: String,
            default: '💬',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// name field already has unique: true, so manual index is not needed

module.exports = mongoose.model('Room', roomSchema);
