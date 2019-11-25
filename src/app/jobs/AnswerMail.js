import Mail from '../../lib/Mail';

class AnswerMail {
  get key() {
    return 'AnswerMail';
  }

  async handle({ data }) {
    const { helpOrder } = data;

    Mail.sendMail({
      to: `${helpOrder.name} <${helpOrder.email}>`,
      subject: 'Sua pergunta foi respondida',
      template: 'answer',
      context: {
        student: helpOrder.name,
        question: helpOrder.question,
        answer: helpOrder.answer,
      },
    });
  }
}

export default new AnswerMail();
