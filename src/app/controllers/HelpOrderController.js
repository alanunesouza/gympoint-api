import * as Yup from 'yup';
import { Op } from 'sequelize';

import Student from '../models/Student';
import HelpOrder from '../models/HelpOrder';

import Mail from '../../lib/Mail';
import Queue from '../../lib/Queue';
import AnswerMail from '../jobs/AnswerMail';

class HelpOrderController {
  async store(req, res) {
    const schema = Yup.object().shape({
      question: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { studentId } = req.params;

    const student = await Student.findByPk(studentId);

    if (!student) {
      return res.status(400).json({ error: 'This user is not a provider' });
    }

    const { question } = req.body;

    const helpOrderId = await HelpOrder.create({
      student_id: studentId,
      question,
    });

    return res.json(helpOrderId);
  }

  async index(req, res) {
    const { studentId } = req.params;
    const { page = 1 } = req.query;

    const student = await Student.findOne({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(400).json({ error: 'This user is not a provider' });
    }

    const helpOrders = await HelpOrder.findAll({
      where: { student_id: studentId },
      order: ['created_at'],
      attributes: ['id', 'question', 'answer', 'answer_at'],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['name', 'email'],
        },
      ],
      limit: 20,
      offset: (page - 1) * 20,
    });

    return res.json(helpOrders);
  }

  async indexAll(req, res) {
    const include = [
      {
        model: Student,
        as: 'student',
        attributes: ['id', 'name'],
      },
    ];

    const { page } = req.query;

    if (page) {
      const limit = 5;

      const plansCount = await HelpOrder.count({
        where: {
          answer: null,
          student_id: {
            [Op.ne]: null,
          },
        },
      });
      const hasMoreItens = page * limit >= plansCount;

      const helpOrders = await HelpOrder.findAll({
        where: {
          answer: null,
          student_id: {
            [Op.ne]: null,
          },
        },
        limit,
        offset: (page - 1) * limit,
        include,
      });
      return res.json({ hasMoreItens, content: helpOrders });
    }

    const helpOrders = await HelpOrder.findAll({
      include,
    });
    return res.json(helpOrders);
  }

  async answer(req, res) {
    const schema = Yup.object().shape({
      answer: Yup.string(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { helpOrderId } = req.params;
    const { answer } = req.body;

    const helpOrder = await HelpOrder.findByPk(helpOrderId, {
      attributes: { exclude: ['created_at', 'updated_at'] },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['name', 'email'],
        },
      ],
    });

    await helpOrder.update({
      answer,
      answer_at: new Date(),
    });

    await Queue.add(AnswerMail.key, {
      helpOrder,
    });

    return res.json(helpOrder);
  }
}

export default new HelpOrderController();
