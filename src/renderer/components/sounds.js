
import Pizzicato from 'pizzicato';
let soundSuccess = Pizzicato.Sound({
    source: 'file',
    options: { path: require('@/assets/beep.wav') }
});
let soundError = Pizzicato.Sound({
    source: 'file',
    options: { path: require('@/assets/failure.wav') }
});

export {soundError, soundSuccess};