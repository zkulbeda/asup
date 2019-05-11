let msg = {
  error: 'Ошибка',
  required: 'Это поле обязательно для заполнения',
  float: 'Это должно быть дробным числом',
  integer: 'Это должно быть целым числом',
  number: 'Это должно быть число',
  lessThan: 'Число должно быть меньше чем {0}.',
  lessThanOrEqualTo: 'Число должно быть меньше или равно {0}.',
  greaterThan: 'Число должно быть больше чем {0}.',
  greaterThanOrEqualTo: 'Число должно быть больше или равно {0}.',
  between: 'Число должно быть больше чем {0}, но меньше {1}.',
  size: 'Размер должен быть {0}.',
  length: 'Длинна должна быть {0}.',
  minLength: 'Должно быть как минимум {0} символов.',
  maxLength: 'Максимальный размер - {0} символ.',
  lengthBetween: 'Длинна должны быть больше {0}, но меньше {1} символов.',
  in: 'Должно быть {0}.',
  notIn: 'Не должно быть {0}.',
  match: 'Не подошло.',
  regex: 'Неверный формат.',
  digit: 'Must be a digit.',
  email: 'Неверный Email.',
  url: 'Некорректный URL.',
  optionCombiner: function (options) {
    if (options.length > 2) {
      options = [options.slice(0, options.length - 1).join(', '), options[options.length - 1]];
    }
    return options.join(' или ');
  }
};
export default msg;