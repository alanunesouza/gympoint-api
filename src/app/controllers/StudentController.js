import * as Yup from 'yup';
import { Op } from 'sequelize';

import Student from '../models/Student';

class StudentController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string()
        .email()
        .required(),
      age: Yup.number()
        .positive()
        .required(),
      weight: Yup.number()
        .positive()
        .required(),
      height: Yup.number()
        .positive()
        .required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const studentExists = await Student.findOne({
      where: { email: req.body.email },
    });

    if (studentExists) {
      return res.status(400).json({ error: 'Student already exists.' });
    }

    const { id, name, email, age, weight, height } = await Student.create(
      req.body
    );

    return res.json({
      id,
      name,
      email,
      age,
      weight,
      height,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      student_id: Yup.number().required(),
      name: Yup.string(),
      email: Yup.string().email(),
      age: Yup.number().positive(),
      weight: Yup.number().positive(),
      height: Yup.number().positive(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const student = await Student.findByPk(req.body.student_id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await student.update(req.body);

    return res.json(student);
  }

  async index(req, res) {
    const { name, page } = req.query;
    const { studentId } = req.params;
    let students;
    let where = {};
    const limit = 5;

    if (studentId) {
      students = await Student.findOne({
        where: {
          id: studentId,
        },
        attributes: ['id', 'name', 'email', 'age', 'weight', 'height'],
      });

      return res.json(students);
    }

    if (page) {
      where = name ? { name: { [Op.iLike]: `%${name}%` } } : {};

      const studentsCount = await Student.count({ where });

      const hasMoreItems = !(page * limit >= studentsCount);

      students = await Student.findAll({
        where,
        limit,
        offset: (page - 1) * limit,
      });

      return res.json({ hasMoreItems, content: students });
    }

    students = await Student.findAll({
      where,
      limit,
      attributes: ['id', 'name', 'email', 'age', 'weight'],
    });

    return res.json(students);
  }

  async delete(req, res) {
    const { studentId } = req.params;
    const student = await Student.findByPk(studentId);

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
    }

    await student.destroy();

    return res.json({ message: `student ${studentId} was deleted` });
  }
}

export default new StudentController();
