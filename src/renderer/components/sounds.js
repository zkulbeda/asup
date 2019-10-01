
import Pizzicato from 'pizzicato';
let soundSuccess = new Pizzicato.Sound({
    source: 'file',
    options: { path: require('@/assets/beep.wav') }
});
let soundError = new Pizzicato.Sound({
    source: 'file',
    options: { path: require('@/assets/failure.wav') }
});

export {soundError, soundSuccess};