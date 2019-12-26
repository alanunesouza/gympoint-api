import * as Yup from 'yup';
import { parseISO, isBefore, addMonths } from 'date-fns';

import Registration from '../models/Registration';
import Plan from '../models/Plan';
import Student from '../models/Student';

class RegistrationController {
  async store(req, res) {
    const schema = Yup.object().shape({
      start_date: Yup.date().required(),
      student_id: Yup.number()
        .positive()
        .required(),
      plan_id: Yup.number()
        .positive()
        .required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { start_date } = req.body;
    const parsedDate = parseISO(start_date);

    const alreadyRegistered = await Registration.findOne({
      where: {
        student_id: req.body.student_id,
      },
    });

    if (alreadyRegistered) {
      return res
        .status(400)
        .json({ error: 'This student is already registered' });
    }

    const plan = await Plan.findByPk(req.body.plan_id);

    if (!plan) {
      return res.status(400).json({ error: 'Plan not found' });
    }

    const { price: planPrice, duration: planDuration } = plan;

    const end_date = addMonths(parsedDate, planDuration);

    const { registration } = await Registration.create({
      ...req.body,
      price: planPrice,
      end_date,
    });

    return res.json(registration);
  }

  async index(req, res) {
    const registrations = await Registration.findAll({
      attributes: ['id', 'start_date', 'end_date', 'price', 'active'],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Plan,
          as: 'plan',
          attributes: ['id', 'title'],
        },
      ],
    });

    return res.json(registrations);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      student_id: Yup.number().positive(),
      plan_id: Yup.number().positive(),
      start_date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { student_id, start_date, plan_id } = req.body;

    const registration = await Registration.findOne({ where: { student_id } });

    if (!registration) {
      return res.status(400).json({ error: 'This student has no enrollment' });
    }

    if (start_date && start_date !== registration.start_date) {
      const parsedDate = parseISO(start_date);
      if (isBefore(parsedDate, new Date())) {
        return res.status(400).json({ error: 'Start date is invalid' });
      }
    }

    if (plan_id && plan_id !== registration.plan_id) {
      const planExists = await Plan.findByPk(plan_id);
      if (!planExists) {
        return res.status(400).json({ error: 'This plan is not registered' });
      }
    }

    const plan = await Plan.findByPk(plan_id);
    const { price: planPrice, duration: planDuration } = plan;
    const total_price = planDuration * planPrice;
    const end_date = addMonths(parseISO(start_date), planDuration);

    const { id } = await registration.update({
      ...req.body,
      price: total_price,
      end_date,
    });

    return res.json({
      id,
      student_id,
      plan_id,
      start_date,
      end_date,
    });
  }

  async delete(req, res) {
    const { registrationId } = req.params;
    const registration = await Registration.findByPk(registrationId);

    await registration.destroy();

    return res.json({ message: `Registration ${registrationId} was deleted` });
  }
}

export default new RegistrationController();
